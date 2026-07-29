import { Component } from 'obsidian'
import ForceGraph from 'force-graph'
import type {
    GraphData,
    GraphNode,
    GraphLink,
    ConfidenceLevel,
    WikiRole,
    MaturityLevel
} from '../types/graph-types'
import { clampNodeSpacing } from '../types/graph-types'

export interface GraphCanvasCallbacks {
    onNodeClick: (node: GraphNode) => void
    onNodeDoubleClick: (node: GraphNode) => void
    onBackgroundClick: () => void
    onNodeRightClick: (node: GraphNode, event: MouseEvent) => void
    onBatchSelectionChange: (selectedIds: Set<string>) => void
    onNodeDragEnd: (nodeId: string, x: number, y: number) => void
}

/** Categorical color palette for generic property visualization */
const CATEGORICAL_PALETTE = [
    'rgba(59, 130, 246, 0.9)',
    'rgba(34, 197, 94, 0.9)',
    'rgba(234, 179, 8, 0.9)',
    'rgba(239, 68, 68, 0.9)',
    'rgba(168, 85, 247, 0.9)',
    'rgba(20, 184, 166, 0.9)',
    'rgba(249, 115, 22, 0.9)',
    'rgba(236, 72, 153, 0.9)',
    'rgba(99, 102, 241, 0.9)',
    'rgba(6, 182, 212, 0.9)'
]

/**
 * Minimal d3-force shapes for the three forces we configure. force-graph's
 * `d3Force()` returns `ForceFn<N> | undefined`, whose body is `[key: string]: any`,
 * so accessing `.strength` / `.distance` / `.distanceMax` would re-introduce
 * unsafe-any. Narrowing to these local interfaces at the call site keeps the
 * type system honest without pulling in `@types/d3-force`.
 */
interface ChargeForce {
    strength(value: number): ChargeForce
    distanceMax(value: number): ChargeForce
}
interface LinkForce {
    distance(value: number): LinkForce
}
interface CenterForce {
    strength(value: number): CenterForce
}

/**
 * Wraps force-graph Canvas renderer with custom node painting, shapes,
 * property-driven visualization, keyboard navigation, and batch selection.
 */
export class GraphCanvas extends Component {
    private graph: ForceGraph<GraphNode, GraphLink> | null = null
    private canvasContainerEl: HTMLElement
    private resizeObserver: ResizeObserver | null = null
    private hoveredNode: GraphNode | null = null
    private selectedNodeId: string | null = null
    private focusedNodeId: string | null = null
    private adjacencyMap: Map<string, Set<string>> = new Map()
    private nodeMap: Map<string, GraphNode> = new Map()
    private nodeList: GraphNode[] = []
    private callbacks: GraphCanvasCallbacks
    private isDark = false
    private searchMatchIds: Set<string> = new Set()
    private batchSelectedIds: Set<string> = new Set()
    private zoomTimer: number | null = null
    private lastClickTime = 0
    private lastClickNodeId: string | null = null

    // Fade transition state
    private nodeAlphas: Map<string, number> = new Map()
    private lastFrameTimeMs = 0
    private static readonly FADE_SPEED = 7 // exponential convergence rate

    // Topology fingerprint of the last setData() call. Used to detect
    // property-only updates (Obsidian indexing storm, frontmatter edits) so we
    // can skip the alpha reset + force-simulation reheat that would otherwise
    // cause visible flicker on every metadata change.
    private lastTopologyKey: string | null = null

    // Group drag state (Shift+drag moves neighbors)
    private shiftHeld = false
    private dragNeighborOffsets: Map<string, { dx: number; dy: number }> | null = null

    // Visualization config
    private colorByProperty = 'explored'
    private sizeByProperty = 'connections'
    private nodeSpacing = 1500
    private nodeScale = 100
    private textScale = 100
    private initialZoomDone = false
    private propertyColorMap: Map<string, string> = new Map()
    private sizeMin = 0
    private sizeMax = 1

    constructor(containerEl: HTMLElement, callbacks: GraphCanvasCallbacks) {
        super()
        this.callbacks = callbacks
        this.canvasContainerEl = containerEl.createDiv({ cls: 'ge-canvas-container' })
    }

    override onload(): void {
        this.initGraph()
        this.setupResizeObserver()
        this.registerDomEvent(activeDocument, 'keydown', (e) => {
            if (e.key === 'Shift') this.shiftHeld = true
        })
        this.registerDomEvent(activeDocument, 'keyup', (e) => {
            if (e.key === 'Shift') this.shiftHeld = false
        })
    }

    override onunload(): void {
        if (this.zoomTimer) window.clearTimeout(this.zoomTimer)
        this.resizeObserver?.disconnect()
        this.resizeObserver = null
        if (this.graph) {
            this.graph._destructor()
            this.graph = null
        }
        this.canvasContainerEl.empty()
    }

    private initGraph(): void {
        const width = this.canvasContainerEl.clientWidth || 600
        const height = this.canvasContainerEl.clientHeight || 400

        this.graph = new ForceGraph<GraphNode, GraphLink>(this.canvasContainerEl)
            .width(width)
            .height(height)
            .backgroundColor('transparent')
            .nodeId('id')
            .linkSource('source')
            .linkTarget('target')
            .cooldownTicks(100)
            .warmupTicks(50)
            .d3AlphaDecay(0.02)
            .autoPauseRedraw(false)
            .minZoom(0.01)
            .maxZoom(20)
            .enableNodeDrag(true)
            .nodeLabel(() => '')
            .nodeCanvasObjectMode(() => 'replace')
            .nodeCanvasObject(
                (node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) =>
                    this.paintNode(node, ctx, globalScale)
            )
            .nodePointerAreaPaint((node: GraphNode, color: string, ctx: CanvasRenderingContext2D) =>
                this.paintNodePointerArea(node, color, ctx)
            )
            .linkCanvasObjectMode(() => 'replace')
            .linkCanvasObject(
                (link: GraphLink, ctx: CanvasRenderingContext2D, globalScale: number) =>
                    this.paintLink(link, ctx, globalScale)
            )
            .onNodeClick((node: GraphNode) => this.handleNodeClick(node))
            .onNodeHover((node: GraphNode | null) => this.handleNodeHover(node))
            .onNodeRightClick((node: GraphNode, event: MouseEvent) => {
                event.preventDefault()
                this.callbacks.onNodeRightClick(node, event)
            })
            .onBackgroundClick((event: MouseEvent) => {
                if (event.detail <= 1) {
                    this.callbacks.onBackgroundClick()
                }
            })
            .onNodeDrag((node: GraphNode) => {
                if (!this.shiftHeld) {
                    this.dragNeighborOffsets = null
                    return
                }
                if (node.x == null || node.y == null) return

                // First drag tick with shift — capture neighbor offsets
                if (!this.dragNeighborOffsets) {
                    this.dragNeighborOffsets = new Map()
                    const neighbors = this.adjacencyMap.get(node.id)
                    if (neighbors) {
                        for (const neighborId of neighbors) {
                            const neighbor = this.nodeMap.get(neighborId)
                            if (neighbor?.x != null && neighbor?.y != null) {
                                this.dragNeighborOffsets.set(neighborId, {
                                    dx: neighbor.x - node.x,
                                    dy: neighbor.y - node.y
                                })
                            }
                        }
                    }
                }

                // Move neighbors with the dragged node
                for (const [neighborId, offset] of this.dragNeighborOffsets) {
                    const neighbor = this.nodeMap.get(neighborId)
                    if (neighbor) {
                        neighbor.fx = node.x + offset.dx
                        neighbor.fy = node.y + offset.dy
                    }
                }
            })
            .onNodeDragEnd((node: GraphNode) => {
                // Handle group-dragged neighbors
                if (this.dragNeighborOffsets) {
                    for (const [neighborId] of this.dragNeighborOffsets) {
                        const neighbor = this.nodeMap.get(neighborId)
                        if (!neighbor) continue

                        if (this.savedPositions.has(neighborId)) {
                            // Was previously pinned — update saved position
                            if (neighbor.fx != null && neighbor.fy != null) {
                                this.callbacks.onNodeDragEnd(neighborId, neighbor.fx, neighbor.fy)
                            }
                        } else {
                            // Was not pinned — release to simulation
                            neighbor.fx = undefined
                            neighbor.fy = undefined
                        }
                    }
                    this.dragNeighborOffsets = null
                }

                // Pin the dragged node
                if (node.id && node.x != null && node.y != null) {
                    node.fx = node.x
                    node.fy = node.y
                    this.callbacks.onNodeDragEnd(node.id, node.x, node.y)
                }
            })

        this.applyForceConfig()
    }

    setNodeSpacing(spacing: number): void {
        this.nodeSpacing = clampNodeSpacing(spacing)
        this.applyForceConfig()
        this.graph?.d3ReheatSimulation()
    }

    setNodeScale(scale: number): void {
        this.nodeScale = Math.max(20, Math.min(300, scale))
    }

    setTextScale(scale: number): void {
        this.textScale = Math.max(20, Math.min(300, scale))
    }

    private applyForceConfig(): void {
        if (!this.graph) return
        const charge = this.graph.d3Force('charge') as ChargeForce | undefined
        charge?.strength(-this.nodeSpacing).distanceMax(this.nodeSpacing * 3)
        const link = this.graph.d3Force('link') as LinkForce | undefined
        link?.distance(Math.round(this.nodeSpacing * 0.5))
        const center = this.graph.d3Force('center') as CenterForce | undefined
        center?.strength(0.03)
    }

    private setupResizeObserver(): void {
        this.resizeObserver = new ResizeObserver((entries) => {
            const entry = entries[0]
            if (entry && this.graph) {
                const { width, height } = entry.contentRect
                if (width > 0 && height > 0) {
                    this.graph.width(width).height(height)
                }
            }
        })
        this.resizeObserver.observe(this.canvasContainerEl)
    }

    // ── Data ──────────────────────────────────────────────────

    private savedPositions: Map<string, { x: number; y: number }> = new Map()

    setSavedPositions(positions: Record<string, { x: number; y: number }>): void {
        this.savedPositions.clear()
        for (const [id, pos] of Object.entries(positions)) {
            this.savedPositions.set(id, pos)
        }
    }

    setData(data: GraphData): void {
        if (!this.graph) return

        // Apply saved positions to nodes (pin them with fx/fy)
        for (const node of data.nodes) {
            const saved = this.savedPositions.get(node.id)
            if (saved) {
                node.x = saved.x
                node.y = saved.y
                node.fx = saved.x
                node.fy = saved.y
            }
        }

        // Build adjacency map
        this.adjacencyMap.clear()
        const linkPairs: string[] = []
        for (const link of data.links) {
            const rawSource = link.source as string | GraphNode
            const rawTarget = link.target as string | GraphNode
            const sourceId =
                typeof rawSource === 'object' ? (rawSource.id ?? '') : String(rawSource)
            const targetId =
                typeof rawTarget === 'object' ? (rawTarget.id ?? '') : String(rawTarget)
            if (!this.adjacencyMap.has(sourceId)) this.adjacencyMap.set(sourceId, new Set())
            if (!this.adjacencyMap.has(targetId)) this.adjacencyMap.set(targetId, new Set())
            this.adjacencyMap.get(sourceId)!.add(targetId)
            this.adjacencyMap.get(targetId)!.add(sourceId)
            // Normalize so (a,b) and (b,a) hash to the same pair.
            linkPairs.push(
                sourceId < targetId ? `${sourceId}\t${targetId}` : `${targetId}\t${sourceId}`
            )
        }

        // Topology fingerprint: sorted node IDs + sorted unique link pairs.
        // Identical across calls iff the structure of the graph is unchanged
        // (only properties — colors, sizes, frontmatter — differ).
        const nodeKey = [...data.nodes]
            .map((n) => n.id)
            .sort()
            .join('\n')
        const linkKey = [...new Set(linkPairs)].sort().join('\n')
        const topologyKey = `${nodeKey}␟${linkKey}`
        const topologyUnchanged = this.lastTopologyKey === topologyKey
        this.lastTopologyKey = topologyKey

        // Reset fade state only when topology actually changed. Otherwise the
        // alphas keyed by node ID stay valid and we avoid the visible flash
        // that would otherwise fire on every property-only update (e.g. during
        // Obsidian's indexing storms).
        if (!topologyUnchanged) {
            this.nodeAlphas.clear()
        }

        // Build node lookup
        this.nodeMap.clear()
        for (const node of data.nodes) {
            this.nodeMap.set(node.id, node)
        }
        this.nodeList = [...data.nodes]

        // Build color/size maps for current property
        this.rebuildPropertyColorMap(data.nodes)
        this.rebuildSizeRange(data.nodes)

        this.graph.graphData(data)

        // Apply force config after data load. Only reheat the simulation when
        // topology changed — reheating on every property tick is what makes
        // the canvas flicker during indexing.
        this.applyForceConfig()
        if (!topologyUnchanged) {
            this.graph.d3ReheatSimulation()
        }

        // Only zoom to fit on first load — subsequent updates preserve user's zoom
        if (!this.initialZoomDone) {
            this.initialZoomDone = true
            if (this.zoomTimer) window.clearTimeout(this.zoomTimer)
            this.zoomTimer = window.setTimeout(() => {
                this.graph?.zoomToFit(400, 40)
            }, 800)
        }
    }

    // ── Selection ─────────────────────────────────────────────

    setSelectedNode(nodeId: string | null): void {
        this.selectedNodeId = nodeId
    }

    setSearchHighlight(matchIds: Set<string>): void {
        this.searchMatchIds = matchIds
    }

    getBatchSelectedIds(): Set<string> {
        return new Set(this.batchSelectedIds)
    }

    toggleBatchSelect(nodeId: string): void {
        if (this.batchSelectedIds.has(nodeId)) {
            this.batchSelectedIds.delete(nodeId)
        } else {
            this.batchSelectedIds.add(nodeId)
        }
        // Update node state
        const node = this.nodeMap.get(nodeId)
        if (node) node.batchSelected = this.batchSelectedIds.has(nodeId)
        this.callbacks.onBatchSelectionChange(new Set(this.batchSelectedIds))
    }

    clearBatchSelection(): void {
        for (const id of this.batchSelectedIds) {
            const node = this.nodeMap.get(id)
            if (node) node.batchSelected = false
        }
        this.batchSelectedIds.clear()
        this.callbacks.onBatchSelectionChange(new Set())
    }

    // ── Visualization config ──────────────────────────────────

    setColorBy(property: string): void {
        if (this.colorByProperty === property) return
        this.colorByProperty = property
        this.rebuildPropertyColorMap(this.nodeList)
    }

    setSizeBy(property: string): void {
        if (this.sizeByProperty === property) return
        this.sizeByProperty = property
        this.rebuildSizeRange(this.nodeList)
    }

    // ── Keyboard navigation ───────────────────────────────────

    focusNextNode(): void {
        const sorted = this.getSortedNodes()
        if (!sorted.length) return
        const currentIdx = this.focusedNodeId
            ? sorted.findIndex((n) => n.id === this.focusedNodeId)
            : -1
        const next = sorted[(currentIdx + 1) % sorted.length]
        if (next) {
            this.focusedNodeId = next.id
            this.centerOnNode(next)
        }
    }

    focusPrevNode(): void {
        const sorted = this.getSortedNodes()
        if (!sorted.length) return
        const currentIdx = this.focusedNodeId
            ? sorted.findIndex((n) => n.id === this.focusedNodeId)
            : 0
        const prev = sorted[(currentIdx - 1 + sorted.length) % sorted.length]
        if (prev) {
            this.focusedNodeId = prev.id
            this.centerOnNode(prev)
        }
    }

    focusConnectedNode(direction: string): void {
        if (!this.focusedNodeId) {
            this.focusNextNode()
            return
        }
        const neighbors = this.adjacencyMap.get(this.focusedNodeId)
        if (!neighbors || neighbors.size === 0) return

        const current = this.nodeMap.get(this.focusedNodeId)
        if (!current) return
        const cx = current.x ?? 0
        const cy = current.y ?? 0

        let bestId: string | null = null
        let bestScore = -Infinity

        for (const neighborId of neighbors) {
            const neighbor = this.nodeMap.get(neighborId)
            if (!neighbor) continue
            const dx = (neighbor.x ?? 0) - cx
            const dy = (neighbor.y ?? 0) - cy

            let score = 0
            switch (direction) {
                case 'ArrowRight':
                    score = dx - Math.abs(dy) * 0.5
                    break
                case 'ArrowLeft':
                    score = -dx - Math.abs(dy) * 0.5
                    break
                case 'ArrowDown':
                    score = dy - Math.abs(dx) * 0.5
                    break
                case 'ArrowUp':
                    score = -dy - Math.abs(dx) * 0.5
                    break
            }

            if (score > bestScore) {
                bestScore = score
                bestId = neighborId
            }
        }

        if (bestId && bestScore > 0) {
            this.focusedNodeId = bestId
            const node = this.nodeMap.get(bestId)
            if (node) this.centerOnNode(node)
        }
    }

    selectFocusedNode(): void {
        if (!this.focusedNodeId) return
        const node = this.nodeMap.get(this.focusedNodeId)
        if (node) this.callbacks.onNodeClick(node)
    }

    toggleBatchSelectFocused(): void {
        if (!this.focusedNodeId) return
        this.toggleBatchSelect(this.focusedNodeId)
    }

    clearFocus(): void {
        this.focusedNodeId = null
    }

    // ── Zoom ──────────────────────────────────────────────────

    zoomIn(): void {
        this.graph?.zoom(this.graph.zoom() * 2, 300)
    }

    zoomOut(): void {
        this.graph?.zoom(this.graph.zoom() * 0.5, 300)
    }

    zoomToFit(): void {
        this.graph?.zoomToFit(400, 40)
    }

    resetView(): void {
        this.graph?.centerAt(0, 0, 300)
        if (this.zoomTimer) window.clearTimeout(this.zoomTimer)
        this.zoomTimer = window.setTimeout(() => {
            this.graph?.zoomToFit(400, 40)
        }, 350)
    }

    // ── Event handlers ────────────────────────────────────────

    private handleNodeClick(node: GraphNode): void {
        const now = Date.now()
        if (this.lastClickNodeId === node.id && now - this.lastClickTime < 400) {
            this.callbacks.onNodeDoubleClick(node)
            this.lastClickTime = 0
            this.lastClickNodeId = null
        } else {
            this.lastClickTime = now
            this.lastClickNodeId = node.id
            this.callbacks.onNodeClick(node)
        }
    }

    private handleNodeHover(node: GraphNode | null): void {
        this.hoveredNode = node
        if (this.graph) {
            this.canvasContainerEl.style.cursor = node ? 'pointer' : 'default'
        }
    }

    // ── Layout ────────────────────────────────────────────────

    // ── Node rendering ────────────────────────────────────────

    private paintNode(node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number): void {
        this.isDark = activeDocument.body.classList.contains('theme-dark')

        const x = node.x ?? 0
        const y = node.y ?? 0
        const size = this.getNodeSize(node)
        const color = this.getNodeColor(node)
        const shape = this.getNodeShape(node)

        const isSelected = this.selectedNodeId === node.id
        const isHovered = this.hoveredNode?.id === node.id
        const isFocused = this.focusedNodeId === node.id
        const isBatchSelected = this.batchSelectedIds.has(node.id)
        const isNeighborOfHovered =
            this.hoveredNode != null &&
            this.adjacencyMap.get(this.hoveredNode.id)?.has(node.id) === true
        const isNeighborOfSelected =
            this.selectedNodeId != null &&
            this.adjacencyMap.get(this.selectedNodeId)?.has(node.id) === true
        const isSearchActive = this.searchMatchIds.size > 0
        const isSearchMatch = this.searchMatchIds.has(node.id)
        const isDimmed =
            (this.hoveredNode != null && !isHovered && !isNeighborOfHovered) ||
            (isSearchActive && !isSearchMatch)

        // Smooth fade transition
        const targetAlpha = isDimmed ? 0.15 : 1
        const prevAlpha = this.nodeAlphas.get(node.id) ?? targetAlpha
        const now = performance.now()
        if (now - this.lastFrameTimeMs > 1) {
            this.lastFrameTimeMs = now
        }
        const factor = 1 - Math.exp(-GraphCanvas.FADE_SPEED * 0.016)
        const alpha = prevAlpha + (targetAlpha - prevAlpha) * factor
        this.nodeAlphas.set(node.id, alpha)
        const ringGap = size * 0.15 // proportional gap for interaction rings
        const ringWidth = Math.max(size * 0.08, 1) / globalScale

        // Interaction rings (inner → outer):
        //   1. Hover glow:  ringGap * 1.5
        //   2. Selected:    ringGap * 2.5
        //   3. Focus/Batch: ringGap * 3.5

        // Glow on hover
        if (isHovered) {
            ctx.beginPath()
            ctx.arc(x, y, size + ringGap * 1.5, 0, 2 * Math.PI)
            ctx.fillStyle = color.replace(/[\d.]+\)$/, '0.3)')
            ctx.fill()
        }

        // Selected ring
        if (isSelected) {
            ctx.beginPath()
            ctx.arc(x, y, size + ringGap * 2.5, 0, 2 * Math.PI)
            ctx.strokeStyle = 'rgba(139, 92, 246, 0.8)'
            ctx.lineWidth = ringWidth * 1.2
            ctx.stroke()
        }

        // Keyboard focus ring
        if (isFocused) {
            ctx.beginPath()
            ctx.arc(x, y, size + ringGap * 3.5, 0, 2 * Math.PI)
            ctx.strokeStyle = 'rgba(251, 191, 36, 0.8)'
            ctx.lineWidth = ringWidth * 1.2
            ctx.stroke()
        }

        // Batch selection ring
        if (isBatchSelected) {
            ctx.beginPath()
            ctx.arc(x, y, size + ringGap * 3.5, 0, 2 * Math.PI)
            ctx.strokeStyle = 'rgba(59, 130, 246, 0.7)'
            ctx.lineWidth = ringWidth * 1.5
            ctx.setLineDash([3 / globalScale, 3 / globalScale])
            ctx.stroke()
            ctx.setLineDash([])
        }

        // Main shape: explored = solid fill + green border, unexplored = hollow outline
        const isExplored = node.explored && !node.external && !node.frontier
        const isUnexplored = !node.explored && !node.external && !node.frontier
        ctx.beginPath()
        this.drawShape(ctx, x, y, size, shape)
        if (isUnexplored) {
            // Hollow: faint fill + colored outline
            ctx.fillStyle = color
            ctx.globalAlpha = alpha * 0.15
            ctx.fill()
            ctx.globalAlpha = alpha * 0.7
            ctx.strokeStyle = color
            ctx.lineWidth = Math.max(size * 0.12, 1.5) / globalScale
            ctx.stroke()
        } else {
            // Solid fill
            ctx.fillStyle = color
            ctx.globalAlpha = node.frontier ? alpha * 0.4 : alpha
            ctx.fill()
        }
        ctx.globalAlpha = 1

        // Green border for explored nodes
        if (isExplored) {
            ctx.beginPath()
            this.drawShape(ctx, x, y, size, shape)
            ctx.globalAlpha = alpha
            ctx.strokeStyle = this.isDark ? 'rgba(34, 197, 94, 0.9)' : 'rgba(22, 163, 74, 0.9)'
            ctx.lineWidth = Math.max(size * 0.15, 2) / globalScale
            ctx.stroke()
            ctx.globalAlpha = 1
        }

        // Graduated indicator (small filled dot at top-right)
        if (node.graduatedNotes.length > 0 && !node.external && !node.frontier) {
            const dotRadius = Math.max(size * 0.2, 2)
            const dotX = x + size * 0.7
            const dotY = y - size * 0.7
            ctx.beginPath()
            ctx.arc(dotX, dotY, dotRadius, 0, 2 * Math.PI)
            ctx.fillStyle = this.isDark ? 'rgba(168, 85, 247, 0.9)' : 'rgba(147, 51, 234, 0.9)'
            ctx.globalAlpha = alpha
            ctx.fill()
            ctx.globalAlpha = 1
        }

        // Frontier dashed outline
        if (node.frontier) {
            ctx.beginPath()
            this.drawShape(ctx, x, y, size, shape)
            ctx.setLineDash([2 / globalScale, 2 / globalScale])
            ctx.strokeStyle = this.isDark ? 'rgba(239, 68, 68, 0.5)' : 'rgba(220, 38, 38, 0.5)'
            ctx.lineWidth = ringWidth
            ctx.stroke()
            ctx.setLineDash([])
        }

        // External dashed outline (non-frontier)
        if (node.external && !node.frontier) {
            ctx.beginPath()
            this.drawShape(ctx, x, y, size, shape)
            ctx.setLineDash([2 / globalScale, 2 / globalScale])
            ctx.strokeStyle = this.isDark ? 'rgba(150, 150, 170, 0.3)' : 'rgba(100, 100, 120, 0.3)'
            ctx.lineWidth = ringWidth
            ctx.stroke()
            ctx.setLineDash([])
        }

        // Index notes (diamond) always show their label — they're navigational
        // anchors and the user needs to spot them at a glance. Other nodes only
        // surface labels on hover / selection / focus or as direct neighbors.
        const isIndex = node.wikiRole === 'index' && !node.frontier && !node.external
        const showLabel =
            isSelected ||
            isHovered ||
            isNeighborOfHovered ||
            isFocused ||
            isNeighborOfSelected ||
            isIndex
        if (showLabel) {
            const isPrimary = isSelected || isHovered || isFocused
            const t = this.textScale / 100
            const fontSize = Math.max(((isPrimary ? 18 : 15) * t) / globalScale, 3)
            ctx.font = `${isPrimary ? 'bold ' : ''}${fontSize}px sans-serif`
            ctx.textAlign = 'center'
            ctx.textBaseline = 'bottom'
            ctx.fillStyle = this.isDark ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)'
            const textBaseAlpha = isPrimary ? 1 : 0.7
            ctx.globalAlpha = textBaseAlpha * alpha
            const roleIcon = this.getRoleIcon(node.wikiRole)
            const label = roleIcon ? `${roleIcon} ${node.name}` : node.name
            ctx.fillText(label, x, y - size - 4)
            ctx.globalAlpha = 1
        }
    }

    private paintNodePointerArea(
        node: GraphNode,
        color: string,
        ctx: CanvasRenderingContext2D
    ): void {
        const x = node.x ?? 0
        const y = node.y ?? 0
        const size = this.getNodeSize(node)
        const hitRadius = Math.max(6, size + 2)
        ctx.beginPath()
        ctx.arc(x, y, hitRadius, 0, 2 * Math.PI)
        ctx.fillStyle = color
        ctx.fill()
    }

    // ── Link rendering ────────────────────────────────────────

    private paintLink(link: GraphLink, ctx: CanvasRenderingContext2D, _globalScale: number): void {
        const rawSource = link.source as unknown as GraphNode | string
        const rawTarget = link.target as unknown as GraphNode | string
        const sourceNode = typeof rawSource === 'object' ? rawSource : null
        const targetNode = typeof rawTarget === 'object' ? rawTarget : null
        const sx = sourceNode?.x ?? 0
        const sy = sourceNode?.y ?? 0
        const tx = targetNode?.x ?? 0
        const ty = targetNode?.y ?? 0

        // Determine if this edge connects to the hovered or selected node
        const hoveredId = this.hoveredNode?.id
        const selectedId = this.selectedNodeId
        const isHighlightedEdge =
            (hoveredId != null && (sourceNode?.id === hoveredId || targetNode?.id === hoveredId)) ||
            (selectedId != null && (sourceNode?.id === selectedId || targetNode?.id === selectedId))

        ctx.beginPath()
        ctx.moveTo(sx, sy)
        ctx.lineTo(tx, ty)

        if (link.toFrontier) {
            const dashLen = 4 / (this.graph?.zoom() ?? 1)
            ctx.setLineDash([dashLen, dashLen])
            ctx.strokeStyle = this.isDark ? 'rgba(239, 68, 68, 0.25)' : 'rgba(220, 38, 38, 0.2)'
            ctx.lineWidth = isHighlightedEdge ? 1.5 : 0.5
        } else if (isHighlightedEdge) {
            ctx.setLineDash([])
            ctx.strokeStyle = this.isDark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.35)'
            ctx.lineWidth = 1.5
        } else {
            ctx.setLineDash([])
            const isExternal = sourceNode?.external || targetNode?.external
            ctx.strokeStyle = this.getLinkColorByRole(link.sourceRole)
            ctx.lineWidth = isExternal ? 0.3 : 0.5
        }

        ctx.stroke()
        ctx.setLineDash([])
    }

    // ── Visual helpers ────────────────────────────────────────

    private getNodeSize(node: GraphNode): number {
        const s = this.nodeScale / 100 // 1.0 at default 100%
        if (node.external) return (12 + node.connectionCount * 1.5) * s
        if (node.frontier) return 18 * s

        let base = 24
        if (this.sizeByProperty === 'connections') {
            base = 24 + Math.min(node.connectionCount * 2.4, 48)
        } else if (this.sizeByProperty !== 'uniform') {
            const val = node.frontmatter[this.sizeByProperty]
            if (typeof val === 'number') {
                const range = this.sizeMax - this.sizeMin
                const norm = range > 0 ? (val - this.sizeMin) / range : 0.5
                base = 24 + Math.max(0, Math.min(1, norm)) * 48
            }
        }
        return base * s
    }

    private getNodeColor(node: GraphNode): string {
        const defaultColor = this.isDark ? 'rgba(148, 163, 184, 0.7)' : 'rgba(100, 116, 139, 0.7)'

        if (node.frontier) {
            return this.isDark ? 'rgba(239, 68, 68, 0.3)' : 'rgba(220, 38, 38, 0.3)'
        }
        if (node.external) {
            return this.isDark ? 'rgba(150, 150, 170, 0.4)' : 'rgba(100, 100, 120, 0.4)'
        }

        switch (this.colorByProperty) {
            case 'explored':
                return node.explored
                    ? this.isDark
                        ? 'rgba(34, 197, 94, 0.9)'
                        : 'rgba(22, 163, 74, 0.9)'
                    : defaultColor

            case 'confidence':
                return this.getConfidenceColor(node.confidence)

            case 'wiki_role':
                return this.getWikiRoleColor(node.wikiRole)

            case 'maturity':
                return this.getMaturityColor(node.maturity)

            case 'created':
                return this.getCreatedColor(node.created)

            default: {
                // Generic property via palette
                const val = this.getPropertyValue(node, this.colorByProperty)
                if (val != null) {
                    const mapped = this.propertyColorMap.get(val)
                    if (mapped) return mapped
                }
                return defaultColor
            }
        }
    }

    private getNodeShape(node: GraphNode): string {
        if (node.frontier || node.external) return 'circle'
        switch (node.wikiRole) {
            case 'index':
                return 'diamond'
            case 'log':
                return 'square'
            case 'source_summary':
                return 'hexagon'
            default:
                return 'circle'
        }
    }

    private drawShape(
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        size: number,
        shape: string
    ): void {
        switch (shape) {
            case 'diamond': {
                ctx.moveTo(x, y - size)
                ctx.lineTo(x + size, y)
                ctx.lineTo(x, y + size)
                ctx.lineTo(x - size, y)
                ctx.closePath()
                break
            }
            case 'square': {
                const half = size * 0.85
                ctx.rect(x - half, y - half, half * 2, half * 2)
                break
            }
            case 'hexagon': {
                for (let i = 0; i < 6; i++) {
                    const angle = (Math.PI / 3) * i - Math.PI / 2
                    const px = x + size * Math.cos(angle)
                    const py = y + size * Math.sin(angle)
                    if (i === 0) ctx.moveTo(px, py)
                    else ctx.lineTo(px, py)
                }
                ctx.closePath()
                break
            }
            default: {
                ctx.arc(x, y, size, 0, 2 * Math.PI)
                break
            }
        }
    }

    private getRoleIcon(role: WikiRole): string {
        switch (role) {
            case 'index':
                return '\u25C7' // diamond
            case 'log':
                return '\u25A1' // square
            case 'source_summary':
                return '\u2B21' // hexagon
            default:
                return ''
        }
    }

    private getConfidenceColor(confidence: ConfidenceLevel): string {
        switch (confidence) {
            case 'high':
                return this.isDark ? 'rgba(34, 197, 94, 0.9)' : 'rgba(22, 163, 74, 0.9)'
            case 'medium':
                return this.isDark ? 'rgba(234, 179, 8, 0.9)' : 'rgba(202, 138, 4, 0.9)'
            case 'low':
                return this.isDark ? 'rgba(249, 115, 22, 0.9)' : 'rgba(234, 88, 12, 0.9)'
            case 'uncertain':
                return this.isDark ? 'rgba(239, 68, 68, 0.9)' : 'rgba(220, 38, 38, 0.9)'
            default:
                return this.isDark ? 'rgba(148, 163, 184, 0.7)' : 'rgba(100, 116, 139, 0.7)'
        }
    }

    private getWikiRoleColor(role: WikiRole): string {
        switch (role) {
            case 'article':
                return this.isDark ? 'rgba(59, 130, 246, 0.9)' : 'rgba(37, 99, 235, 0.9)'
            case 'index':
                return this.isDark ? 'rgba(168, 85, 247, 0.9)' : 'rgba(147, 51, 234, 0.9)'
            case 'log':
                return this.isDark ? 'rgba(20, 184, 166, 0.9)' : 'rgba(13, 148, 136, 0.9)'
            case 'source_summary':
                return this.isDark ? 'rgba(234, 179, 8, 0.9)' : 'rgba(202, 138, 4, 0.9)'
            default:
                return this.isDark ? 'rgba(148, 163, 184, 0.7)' : 'rgba(100, 116, 139, 0.7)'
        }
    }

    private getMaturityColor(maturity: MaturityLevel): string {
        switch (maturity) {
            case 'mature':
                return this.isDark ? 'rgba(34, 197, 94, 0.9)' : 'rgba(22, 163, 74, 0.9)'
            case 'substantial':
                return this.isDark ? 'rgba(59, 130, 246, 0.9)' : 'rgba(37, 99, 235, 0.9)'
            case 'draft':
                return this.isDark ? 'rgba(234, 179, 8, 0.9)' : 'rgba(202, 138, 4, 0.9)'
            case 'stub':
                return this.isDark ? 'rgba(249, 115, 22, 0.9)' : 'rgba(234, 88, 12, 0.9)'
            default:
                return this.isDark ? 'rgba(148, 163, 184, 0.7)' : 'rgba(100, 116, 139, 0.7)'
        }
    }

    private getCreatedColor(created: number | null): string {
        if (created == null) {
            return this.isDark ? 'rgba(148, 163, 184, 0.7)' : 'rgba(100, 116, 139, 0.7)'
        }
        const age = Date.now() - created
        const day = 86400000
        if (age < 7 * day) {
            return this.isDark ? 'rgba(34, 197, 94, 0.9)' : 'rgba(22, 163, 74, 0.9)'
        }
        if (age < 30 * day) {
            return this.isDark ? 'rgba(59, 130, 246, 0.9)' : 'rgba(37, 99, 235, 0.9)'
        }
        if (age < 90 * day) {
            return this.isDark ? 'rgba(168, 85, 247, 0.9)' : 'rgba(147, 51, 234, 0.9)'
        }
        return this.isDark ? 'rgba(148, 163, 184, 0.7)' : 'rgba(100, 116, 139, 0.7)'
    }

    private getLinkColorByRole(role?: WikiRole): string {
        const isDark = this.isDark
        switch (role) {
            case 'index':
                return isDark ? 'rgba(168, 85, 247, 0.15)' : 'rgba(147, 51, 234, 0.12)'
            case 'source_summary':
                return isDark ? 'rgba(234, 179, 8, 0.15)' : 'rgba(202, 138, 4, 0.12)'
            default:
                return isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)'
        }
    }

    // ── Property mapping helpers ──────────────────────────────

    private getPropertyValue(node: GraphNode, property: string): string | null {
        switch (property) {
            case 'explored':
                return node.explored ? 'explored' : 'unexplored'
            case 'confidence':
                return node.confidence
            case 'wiki_role':
                return node.wikiRole
            case 'maturity':
                return node.maturity
            case 'tags':
                return node.tags[0] ?? null
            case 'created':
                return node.created != null ? this.getAgeCategory(node.created) : null
            default: {
                const val: unknown = node.frontmatter[property]
                if (val == null) return null
                if (
                    typeof val === 'string' ||
                    typeof val === 'number' ||
                    typeof val === 'boolean'
                ) {
                    return String(val)
                }
                return null
            }
        }
    }

    private getAgeCategory(timestamp: number): string {
        const age = Date.now() - timestamp
        const day = 86400000
        if (age < 7 * day) return 'This week'
        if (age < 30 * day) return 'This month'
        if (age < 90 * day) return 'Recent'
        return 'Older'
    }

    private rebuildPropertyColorMap(nodes: GraphNode[]): void {
        this.propertyColorMap.clear()
        // Only needed for generic/palette-based properties
        if (
            this.colorByProperty === 'explored' ||
            this.colorByProperty === 'confidence' ||
            this.colorByProperty === 'wiki_role' ||
            this.colorByProperty === 'maturity'
        ) {
            return
        }

        const values = new Set<string>()
        for (const node of nodes) {
            if (node.external || node.frontier) continue
            const val = this.getPropertyValue(node, this.colorByProperty)
            if (val != null) values.add(val)
        }

        let i = 0
        for (const val of values) {
            const paletteColor = CATEGORICAL_PALETTE[i % CATEGORICAL_PALETTE.length]
            if (paletteColor) {
                this.propertyColorMap.set(val, paletteColor)
            }
            i++
        }
    }

    private rebuildSizeRange(nodes: GraphNode[]): void {
        if (this.sizeByProperty === 'connections' || this.sizeByProperty === 'uniform') {
            return
        }

        let min = Infinity
        let max = -Infinity
        for (const node of nodes) {
            if (node.external || node.frontier) continue
            const val = node.frontmatter[this.sizeByProperty]
            if (typeof val === 'number') {
                if (val < min) min = val
                if (val > max) max = val
            }
        }
        this.sizeMin = min === Infinity ? 0 : min
        this.sizeMax = max === -Infinity ? 1 : max
    }

    private getSortedNodes(): GraphNode[] {
        return [...this.nodeList]
            .filter((n) => !n.frontier)
            .sort((a, b) => {
                const ax = a.x ?? 0
                const ay = a.y ?? 0
                const bx = b.x ?? 0
                const by = b.y ?? 0
                return ax - bx || ay - by
            })
    }

    centerOnNode(node: GraphNode): void {
        if (!this.graph) return
        this.graph.centerAt(node.x ?? 0, node.y ?? 0, 300)
    }

    // ── Viewport info (for minimap) ──────────────────────────

    /**
     * Returns the current viewport state for minimap rendering.
     * Includes all node positions, current zoom, center, and canvas dimensions.
     */
    getViewportState(): {
        nodes: ReadonlyArray<{ x: number; y: number; color: string }>
        zoom: number
        centerX: number
        centerY: number
        width: number
        height: number
    } | null {
        if (!this.graph) return null
        const zoom = this.graph.zoom()
        const center = this.graph.centerAt()
        const w = this.canvasContainerEl.clientWidth
        const h = this.canvasContainerEl.clientHeight
        const nodes = this.nodeList.map((n) => ({
            x: n.x ?? 0,
            y: n.y ?? 0,
            color: this.getNodeColor(n)
        }))
        return {
            nodes,
            zoom,
            centerX: center.x,
            centerY: center.y,
            width: w,
            height: h
        }
    }

    /**
     * Pan the main graph to center on a specific world coordinate.
     */
    panTo(worldX: number, worldY: number): void {
        this.graph?.centerAt(worldX, worldY, 300)
    }
}
