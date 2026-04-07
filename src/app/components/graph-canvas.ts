import { Component } from 'obsidian'
import ForceGraph from 'force-graph'
import type { GraphData, GraphNode, GraphLink } from '../types/graph-types'

export interface GraphCanvasCallbacks {
    onNodeClick: (node: GraphNode) => void
    onNodeDoubleClick: (node: GraphNode) => void
    onBackgroundClick: () => void
}

/**
 * Wraps force-graph Canvas renderer with custom node painting and interactions.
 */
export class GraphCanvas extends Component {
    private graph: ForceGraph<GraphNode, GraphLink> | null = null
    private canvasContainerEl: HTMLElement
    private resizeObserver: ResizeObserver | null = null
    private hoveredNode: GraphNode | null = null
    private selectedNodeId: string | null = null
    private adjacencyMap: Map<string, Set<string>> = new Map()
    private callbacks: GraphCanvasCallbacks
    private isDark = false
    private searchMatchIds: Set<string> = new Set()
    private zoomTimer: ReturnType<typeof setTimeout> | null = null
    private lastClickTime = 0
    private lastClickNodeId: string | null = null

    constructor(containerEl: HTMLElement, callbacks: GraphCanvasCallbacks) {
        super()
        this.callbacks = callbacks

        this.canvasContainerEl = containerEl.createDiv({ cls: 'ge-canvas-container' })
    }

    override onload(): void {
        this.initGraph()
        this.setupResizeObserver()
    }

    override onunload(): void {
        if (this.zoomTimer) clearTimeout(this.zoomTimer)
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
            .minZoom(0.1)
            .maxZoom(20)
            .enableNodeDrag(true)
            .nodeCanvasObjectMode(() => 'replace')
            .nodeCanvasObject(
                (node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) =>
                    this.paintNode(node, ctx, globalScale)
            )
            .nodePointerAreaPaint((node: GraphNode, color: string, ctx: CanvasRenderingContext2D) =>
                this.paintNodePointerArea(node, color, ctx)
            )
            .linkColor(() => this.getLinkColor())
            .linkWidth((link: GraphLink) => this.getLinkWidth(link))
            .onNodeClick((node: GraphNode) => this.handleNodeClick(node))
            .onNodeHover((node: GraphNode | null) => this.handleNodeHover(node))
            .onBackgroundClick((event: MouseEvent) => {
                if (event.detail <= 1) {
                    this.callbacks.onBackgroundClick()
                }
            })
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

    setData(data: GraphData): void {
        if (!this.graph) return

        this.adjacencyMap.clear()
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
        }

        this.graph.graphData(data)

        if (this.zoomTimer) clearTimeout(this.zoomTimer)
        this.zoomTimer = setTimeout(() => {
            this.graph?.zoomToFit(400, 40)
        }, 500)
    }

    setSelectedNode(nodeId: string | null): void {
        this.selectedNodeId = nodeId
    }

    setSearchHighlight(matchIds: Set<string>): void {
        this.searchMatchIds = matchIds
        // force-graph re-renders on next frame automatically
    }

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
        if (this.zoomTimer) clearTimeout(this.zoomTimer)
        this.zoomTimer = setTimeout(() => this.graph?.zoomToFit(400, 40), 350)
    }

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

    private getNodeSize(node: GraphNode): number {
        if (node.external) {
            return Math.max(2, Math.min(8, 2 + node.connectionCount * 0.3))
        }
        return Math.max(3, Math.min(12, 3 + node.connectionCount * 0.4))
    }

    private getNodeColor(node: GraphNode): string {
        if (node.external) {
            return this.isDark ? 'rgba(150, 150, 170, 0.4)' : 'rgba(100, 100, 120, 0.4)'
        }
        if (node.explored) {
            return this.isDark ? 'rgba(34, 197, 94, 0.9)' : 'rgba(22, 163, 74, 0.9)'
        }
        return this.isDark ? 'rgba(148, 163, 184, 0.7)' : 'rgba(100, 116, 139, 0.7)'
    }

    private paintNode(node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number): void {
        this.isDark = document.body.classList.contains('theme-dark')

        const x = node.x ?? 0
        const y = node.y ?? 0
        const size = this.getNodeSize(node)
        const color = this.getNodeColor(node)
        const isSelected = this.selectedNodeId === node.id
        const isHovered = this.hoveredNode?.id === node.id
        const isNeighborOfHovered =
            this.hoveredNode != null &&
            this.adjacencyMap.get(this.hoveredNode.id)?.has(node.id) === true
        const isSearchActive = this.searchMatchIds.size > 0
        const isSearchMatch = this.searchMatchIds.has(node.id)
        const isDimmed =
            (this.hoveredNode != null && !isHovered && !isNeighborOfHovered) ||
            (isSearchActive && !isSearchMatch)

        const alpha = isDimmed ? 0.15 : 1

        // Glow effect on hover
        if (isHovered) {
            ctx.beginPath()
            ctx.arc(x, y, size + 4, 0, 2 * Math.PI)
            ctx.fillStyle = color.replace(/[\d.]+\)$/, '0.3)')
            ctx.fill()
        }

        // Explored ring
        if (node.explored && !node.external) {
            ctx.beginPath()
            ctx.arc(x, y, size + 2, 0, 2 * Math.PI)
            ctx.strokeStyle = isDimmed ? 'rgba(34, 197, 94, 0.15)' : 'rgba(34, 197, 94, 0.6)'
            ctx.lineWidth = 1.5 / globalScale
            ctx.stroke()
        }

        // Selected ring
        if (isSelected) {
            ctx.beginPath()
            ctx.arc(x, y, size + 3, 0, 2 * Math.PI)
            ctx.strokeStyle = 'rgba(139, 92, 246, 0.8)'
            ctx.lineWidth = 2 / globalScale
            ctx.stroke()
        }

        // Main circle
        ctx.beginPath()
        ctx.arc(x, y, size, 0, 2 * Math.PI)
        ctx.fillStyle = color
        ctx.globalAlpha = alpha
        ctx.fill()
        ctx.globalAlpha = 1

        // External node dashed outline
        if (node.external) {
            ctx.setLineDash([2 / globalScale, 2 / globalScale])
            ctx.strokeStyle = this.isDark ? 'rgba(150, 150, 170, 0.3)' : 'rgba(100, 100, 120, 0.3)'
            ctx.lineWidth = 1 / globalScale
            ctx.stroke()
            ctx.setLineDash([])
        }

        // Label for selected, hovered, or neighbor of hovered
        if (isSelected || isHovered || isNeighborOfHovered) {
            const fontSize = Math.max(10 / globalScale, 2)
            ctx.font = `${fontSize}px sans-serif`
            ctx.textAlign = 'center'
            ctx.textBaseline = 'top'
            ctx.fillStyle = this.isDark ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)'
            ctx.globalAlpha = isDimmed ? 0.3 : 1
            ctx.fillText(node.name, x, y + size + 2)
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

    private getLinkColor(): string {
        const isDark = document.body.classList.contains('theme-dark')
        return isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)'
    }

    private getLinkWidth(link: GraphLink): number {
        const rawSource = link.source as string | GraphNode
        const rawTarget = link.target as string | GraphNode
        const sourceNode = typeof rawSource === 'object' ? rawSource : null
        const targetNode = typeof rawTarget === 'object' ? rawTarget : null
        if (sourceNode?.external || targetNode?.external) return 0.3
        return 0.5
    }
}
