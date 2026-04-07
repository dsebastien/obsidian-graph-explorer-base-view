import { BasesView, debounce, TFile } from 'obsidian'
import type { Debouncer, QueryController } from 'obsidian'
import type { GraphExplorerPlugin } from '../../plugin'
import { GRAPH_EXPLORER_VIEW_TYPE } from './graph-explorer.constants'
import { GraphCanvas } from '../../components/graph-canvas'
import { GraphSidePanel } from '../../components/graph-side-panel'
import { GraphControls } from '../../components/graph-controls'
import { GraphZoomControls } from '../../components/graph-zoom-controls'
import { GraphContextMenu } from '../../components/graph-context-menu'
import type { ContextMenuAction } from '../../components/graph-context-menu'
import { buildGraphData } from '../../services/graph-data-builder'
import { setNoteExplored } from '../../utils/frontmatter-utils'
import type {
    ExploredFilter,
    GraphData,
    GraphLayout,
    GraphNode,
    GraphStats,
    ConfidenceLevel,
    WikiRole,
    ViewPreset
} from '../../types/graph-types'
import { VIEW_PRESETS } from '../../types/graph-types'
import { log } from '../../../utils/log'

/**
 * Main orchestrator BasesView that ties all graph components together.
 * Creates child components, handles data flow, manages the graph lifecycle,
 * keyboard navigation, context menus, batch operations, and view presets.
 */
export class GraphExplorerView extends BasesView {
    override type = GRAPH_EXPLORER_VIEW_TYPE

    private scrollEl: HTMLElement
    private viewEl: HTMLElement | null = null
    private graphCanvas: GraphCanvas | null = null
    private sidePanel: GraphSidePanel | null = null
    private controls: GraphControls | null = null
    private zoomControls: GraphZoomControls | null = null
    private contextMenu: GraphContextMenu | null = null
    private currentGraphData: GraphData = { nodes: [], links: [] }
    private searchQuery = ''
    private debouncedUpdate: Debouncer<[], void>
    private initialized = false
    private activePreset = ''

    private plugin: GraphExplorerPlugin

    constructor(controller: QueryController, scrollEl: HTMLElement, plugin: GraphExplorerPlugin) {
        super(controller)
        this.scrollEl = scrollEl
        this.plugin = plugin
        this.debouncedUpdate = debounce(() => {
            this.rebuildGraph()
        }, 50)
    }

    override onload(): void {
        this.buildUI()
        this.initialized = true
    }

    override onunload(): void {
        this.graphCanvas?.unload()
        this.sidePanel?.unload()
        this.controls?.unload()
        this.zoomControls?.unload()
        this.contextMenu?.unload()
        this.graphCanvas = null
        this.sidePanel = null
        this.controls = null
        this.zoomControls = null
        this.contextMenu = null
        this.viewEl?.remove()
        this.viewEl = null
        this.initialized = false
    }

    override onDataUpdated(): void {
        if (!this.initialized) return
        this.syncConfigToCanvas()
        this.debouncedUpdate()
    }

    // ── UI Setup ──────────────────────────────────────────────

    private buildUI(): void {
        this.viewEl = this.scrollEl.createDiv({ cls: 'ge-view' })
        this.viewEl.tabIndex = 0 // focusable for keyboard events

        // Graph canvas area
        const graphArea = this.viewEl.createDiv({ cls: 'ge-graph-area' })

        // Canvas
        this.graphCanvas = new GraphCanvas(graphArea, {
            onNodeClick: (node) => this.handleNodeClick(node),
            onNodeDoubleClick: (node) => this.handleNodeDoubleClick(node),
            onBackgroundClick: () => this.handleBackgroundClick(),
            onNodeRightClick: (node, event) => this.handleNodeRightClick(node, event),
            onBatchSelectionChange: (ids) => this.handleBatchSelectionChange(ids)
        })
        this.addChild(this.graphCanvas)

        // Controls overlay
        this.controls = new GraphControls(graphArea, {
            onSearchChange: (query) => this.handleSearchChange(query),
            onExploredFilterChange: (filter) => {
                this.config?.set('exploredFilter', filter)
                this.rebuildGraph()
            },
            onBatchToggleExplored: () => void this.handleBatchToggleExplored()
        })
        this.addChild(this.controls)

        // Restore saved filter from config
        const savedFilter = this.config?.get('exploredFilter') as ExploredFilter | undefined
        if (savedFilter && savedFilter !== 'all') {
            this.controls.setFilter(savedFilter)
        }

        // Apply preset if set
        const savedPreset = this.config?.get('preset') as string | undefined
        if (savedPreset) {
            this.activePreset = savedPreset
        }

        // Apply visualization config to canvas
        this.syncConfigToCanvas()

        // Zoom controls
        this.zoomControls = new GraphZoomControls(graphArea, {
            onZoomIn: () => this.graphCanvas?.zoomIn(),
            onZoomOut: () => this.graphCanvas?.zoomOut(),
            onZoomToFit: () => this.graphCanvas?.zoomToFit(),
            onReset: () => this.graphCanvas?.resetView()
        })
        this.addChild(this.zoomControls)

        // Context menu
        this.contextMenu = new GraphContextMenu(graphArea)
        this.addChild(this.contextMenu)

        // Side panel
        this.sidePanel = new GraphSidePanel(this.viewEl, this.app, {
            onToggleExplored: (node) => void this.handleToggleExplored(node),
            onClose: () => this.handleBackgroundClick(),
            onNavigateToNode: (nodeId) => this.handleNavigateToNode(nodeId)
        })
        this.addChild(this.sidePanel)

        // Keyboard events
        this.registerDomEvent(this.viewEl, 'keydown', (e) => this.handleKeyDown(e))

        // Initial render
        this.rebuildGraph()
    }

    // ── Config sync ───────────────────────────────────────────

    private syncConfigToCanvas(): void {
        const colorBy =
            (this.config?.get('colorBy') as string) ||
            this.plugin.settings.defaultColorBy ||
            'explored'
        const sizeBy =
            (this.config?.get('sizeBy') as string) ||
            this.plugin.settings.defaultSizeBy ||
            'connections'
        const layout =
            (this.config?.get('layout') as string) || this.plugin.settings.defaultLayout || 'force'

        this.graphCanvas?.setColorBy(colorBy)
        this.graphCanvas?.setSizeBy(sizeBy)
        this.graphCanvas?.setLayout(layout as GraphLayout)
        this.graphCanvas?.setNodeSpacing(this.plugin.settings.nodeSpacing)

        // Handle preset changes
        const preset = (this.config?.get('preset') as string) || ''
        if (preset && preset !== this.activePreset) {
            this.applyPreset(preset)
        }
        this.activePreset = preset
    }

    private applyPreset(presetKey: string): void {
        const preset: ViewPreset | undefined = VIEW_PRESETS.find((p) => p.key === presetKey)
        if (!preset) return

        for (const [key, value] of Object.entries(preset.config)) {
            this.config?.set(key, value)
        }

        log(`Applied preset: ${preset.name}`, 'debug')
    }

    // ── Graph data ────────────────────────────────────────────

    private rebuildGraph(): void {
        if (!this.data) return
        const entries = this.data.data
        const exploredProperty =
            (this.config?.get('exploredProperty') as string) ||
            this.plugin.settings.exploredPropertyName ||
            'explored'
        const showExternal = (this.config?.get('showExternalNodes') as boolean) || false
        const showFrontier =
            (this.config?.get('showFrontier') as boolean) ||
            this.plugin.settings.showFrontierDefault ||
            false
        const exploredFilter = (this.controls?.getFilter() as ExploredFilter) || 'all'

        this.currentGraphData = buildGraphData(
            entries,
            this.app.metadataCache,
            exploredProperty,
            showExternal,
            exploredFilter,
            showFrontier
        )

        if (this.currentGraphData.nodes.length === 0) {
            if (!this.viewEl?.querySelector('.ge-empty-state')) {
                this.viewEl?.createDiv({
                    cls: 'ge-empty-state',
                    text: 'No notes to display'
                })
            }
            return
        }
        this.viewEl?.querySelector('.ge-empty-state')?.remove()

        this.graphCanvas?.setData(this.currentGraphData)

        // Update stats
        const stats = this.computeStats()
        this.controls?.updateStats(stats)

        // Update side panel with current graph node paths
        const nodePaths = new Set<string>(
            this.currentGraphData.nodes.filter((n) => !n.frontier).map((n) => n.id)
        )
        this.sidePanel?.setGraphNodePaths(nodePaths)

        // Apply search highlight if active
        if (this.searchQuery) {
            this.applySearchHighlight(this.searchQuery)
        }
    }

    private computeStats(): GraphStats {
        const nodes = this.currentGraphData.nodes
        const nonExternal = nodes.filter((n) => !n.external && !n.frontier)
        const exploredCount = nonExternal.filter((n) => n.explored).length
        const unexploredCount = nonExternal.filter((n) => !n.explored).length

        const confidenceDistribution: Record<ConfidenceLevel, number> = {
            high: 0,
            medium: 0,
            low: 0,
            uncertain: 0,
            unknown: 0
        }
        const roleDistribution: Record<WikiRole, number> = {
            article: 0,
            index: 0,
            log: 0,
            source_summary: 0,
            unknown: 0
        }

        for (const n of nonExternal) {
            confidenceDistribution[n.confidence]++
            roleDistribution[n.wikiRole]++
        }

        const frontierCount = nodes.filter((n) => n.frontier).length
        const total = nonExternal.length
        const coveragePercent = total > 0 ? Math.round((exploredCount / total) * 100) : 0

        return {
            totalNodes: nodes.length,
            totalLinks: this.currentGraphData.links.length,
            exploredCount,
            unexploredCount,
            confidenceDistribution,
            roleDistribution,
            frontierCount,
            coveragePercent
        }
    }

    // ── Node events ───────────────────────────────────────────

    private handleNodeClick(node: GraphNode): void {
        this.contextMenu?.hide()
        this.graphCanvas?.setSelectedNode(node.id)
        void this.sidePanel?.showNode(node)
    }

    private handleNodeDoubleClick(node: GraphNode): void {
        if (node.frontier) return // can't open non-existent file
        const file = this.app.vault.getAbstractFileByPath(node.id)
        if (file instanceof TFile) {
            void this.app.workspace.getLeaf('tab').openFile(file)
        }
    }

    private handleBackgroundClick(): void {
        this.contextMenu?.hide()
        this.graphCanvas?.setSelectedNode(null)
        this.sidePanel?.hide()
    }

    private handleNavigateToNode(nodeId: string): void {
        const node = this.currentGraphData.nodes.find((n) => n.id === nodeId)
        if (!node) return
        this.graphCanvas?.setSelectedNode(node.id)
        void this.sidePanel?.showNode(node)
    }

    private async handleToggleExplored(node: GraphNode): Promise<void> {
        if (node.frontier) return
        const file = this.app.vault.getAbstractFileByPath(node.id)
        if (!(file instanceof TFile)) return

        const exploredProperty = (this.config?.get('exploredProperty') as string) || 'explored'
        const newExplored = !node.explored

        await setNoteExplored(this.app, file, exploredProperty, newExplored)

        // Update side panel immediately (optimistic)
        this.sidePanel?.updateExploredState(newExplored)

        log(`Toggled explored: ${node.name} -> ${String(newExplored)}`, 'debug')
    }

    // ── Context menu ──────────────────────────────────────────

    private handleNodeRightClick(node: GraphNode, event: MouseEvent): void {
        const graphArea = this.viewEl?.querySelector('.ge-graph-area')
        if (!graphArea) return
        const rect = graphArea.getBoundingClientRect()
        const x = event.clientX - rect.left
        const y = event.clientY - rect.top

        const actions = this.getContextMenuActions(node)
        this.contextMenu?.show(node, x, y, actions)
    }

    private getContextMenuActions(node: GraphNode): ContextMenuAction[] {
        const actions: ContextMenuAction[] = []

        if (!node.frontier) {
            actions.push({
                label: 'Open in new tab',
                icon: '\u2197',
                callback: () => this.handleNodeDoubleClick(node)
            })
        }

        if (!node.external && !node.frontier) {
            actions.push({
                label: node.explored ? 'Mark as unexplored' : 'Mark as explored',
                icon: node.explored ? '\u25CB' : '\u2713',
                callback: () => void this.handleToggleExplored(node)
            })
        }

        if (!node.frontier) {
            actions.push({
                label: 'Copy wikilink',
                icon: '\u{1F4CB}',
                callback: () => {
                    const name = node.name
                    void navigator.clipboard.writeText(`[[${name}]]`)
                }
            })
        }

        const isBatchSelected = this.graphCanvas?.getBatchSelectedIds().has(node.id) ?? false
        actions.push({
            label: isBatchSelected ? 'Remove from selection' : 'Add to selection',
            icon: isBatchSelected ? '\u2212' : '\u002B',
            callback: () => this.graphCanvas?.toggleBatchSelect(node.id)
        })

        return actions
    }

    // ── Batch operations ──────────────────────────────────────

    private handleBatchSelectionChange(selectedIds: Set<string>): void {
        this.controls?.setBatchSelectionCount(selectedIds.size)
    }

    private async handleBatchToggleExplored(): Promise<void> {
        const selectedIds = this.graphCanvas?.getBatchSelectedIds()
        if (!selectedIds || selectedIds.size === 0) return

        const exploredProperty = (this.config?.get('exploredProperty') as string) || 'explored'

        for (const nodeId of selectedIds) {
            const node = this.currentGraphData.nodes.find((n) => n.id === nodeId)
            if (!node || node.frontier || node.external) continue

            const file = this.app.vault.getAbstractFileByPath(nodeId)
            if (!(file instanceof TFile)) continue

            const newExplored = !node.explored
            await setNoteExplored(this.app, file, exploredProperty, newExplored)
        }

        this.graphCanvas?.clearBatchSelection()
        log(`Batch toggled explored for ${selectedIds.size} nodes`, 'debug')
    }

    // ── Keyboard navigation ───────────────────────────────────

    private handleKeyDown(e: KeyboardEvent): void {
        // Don't capture when typing in search
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
            return
        }

        switch (e.key) {
            case 'Tab':
                e.preventDefault()
                if (e.shiftKey) {
                    this.graphCanvas?.focusPrevNode()
                } else {
                    this.graphCanvas?.focusNextNode()
                }
                break
            case 'Enter':
                e.preventDefault()
                if (e.shiftKey) {
                    this.graphCanvas?.toggleBatchSelectFocused()
                } else {
                    this.graphCanvas?.selectFocusedNode()
                }
                break
            case 'Escape':
                e.preventDefault()
                this.contextMenu?.hide()
                this.handleBackgroundClick()
                this.graphCanvas?.clearFocus()
                this.graphCanvas?.clearBatchSelection()
                break
            case 'ArrowUp':
            case 'ArrowDown':
            case 'ArrowLeft':
            case 'ArrowRight':
                e.preventDefault()
                this.graphCanvas?.focusConnectedNode(e.key)
                break
        }
    }

    // ── Search ────────────────────────────────────────────────

    private handleSearchChange(query: string): void {
        this.searchQuery = query
        this.applySearchHighlight(query)
    }

    private applySearchHighlight(query: string): void {
        if (!query.trim()) {
            this.graphCanvas?.setSearchHighlight(new Set())
            return
        }
        const lowerQuery = query.toLowerCase()
        const matchIds = new Set<string>(
            this.currentGraphData.nodes
                .filter((n) => n.name.toLowerCase().includes(lowerQuery))
                .map((n) => n.id)
        )
        this.graphCanvas?.setSearchHighlight(matchIds)
    }
}
