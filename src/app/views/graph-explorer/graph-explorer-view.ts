import { BasesView, debounce, TFile } from 'obsidian'
import type { Debouncer, QueryController } from 'obsidian'
import type { GraphExplorerPlugin } from '../../plugin'
import { GRAPH_EXPLORER_VIEW_TYPE } from './graph-explorer.constants'
import { GraphCanvas } from '../../components/graph-canvas'
import { GraphSidePanel } from '../../components/graph-side-panel'
import { GraphControls } from '../../components/graph-controls'
import { GraphZoomControls } from '../../components/graph-zoom-controls'
import { buildGraphData } from '../../services/graph-data-builder'
import { setNoteExplored } from '../../utils/frontmatter-utils'
import type { ExploredFilter, GraphData, GraphNode } from '../../types/graph-types'
import { log } from '../../../utils/log'

/**
 * Main orchestrator BasesView that ties all graph components together.
 * Creates child components (GraphCanvas, GraphSidePanel, GraphControls, GraphZoomControls),
 * handles data flow between them, and manages the graph lifecycle.
 */
export class GraphExplorerView extends BasesView {
    override type = GRAPH_EXPLORER_VIEW_TYPE

    private scrollEl: HTMLElement
    private viewEl: HTMLElement | null = null
    private graphCanvas: GraphCanvas | null = null
    private sidePanel: GraphSidePanel | null = null
    private controls: GraphControls | null = null
    private zoomControls: GraphZoomControls | null = null
    private currentGraphData: GraphData = { nodes: [], links: [] }
    private searchQuery = ''
    private debouncedUpdate: Debouncer<[], void>
    private initialized = false

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
        this.graphCanvas = null
        this.sidePanel = null
        this.controls = null
        this.zoomControls = null
        this.viewEl?.remove()
        this.viewEl = null
        this.initialized = false
    }

    override onDataUpdated(): void {
        if (!this.initialized) return
        this.debouncedUpdate()
    }

    private buildUI(): void {
        this.viewEl = this.scrollEl.createDiv({ cls: 'ge-view' })

        // Graph canvas area
        const graphArea = this.viewEl.createDiv({ cls: 'ge-graph-area' })

        // Canvas
        this.graphCanvas = new GraphCanvas(graphArea, {
            onNodeClick: (node) => this.handleNodeClick(node),
            onNodeDoubleClick: (node) => this.handleNodeDoubleClick(node),
            onBackgroundClick: () => this.handleBackgroundClick()
        })
        this.addChild(this.graphCanvas)

        // Controls overlay
        this.controls = new GraphControls(graphArea, {
            onSearchChange: (query) => this.handleSearchChange(query),
            onExploredFilterChange: (filter) => {
                this.config.set('exploredFilter', filter)
                this.rebuildGraph()
            }
        })
        this.addChild(this.controls)

        // Restore saved filter from config
        const savedFilter = this.config.get('exploredFilter') as ExploredFilter | undefined
        if (savedFilter && savedFilter !== 'all') {
            this.controls.setFilter(savedFilter)
        }

        // Zoom controls
        this.zoomControls = new GraphZoomControls(graphArea, {
            onZoomIn: () => this.graphCanvas?.zoomIn(),
            onZoomOut: () => this.graphCanvas?.zoomOut(),
            onZoomToFit: () => this.graphCanvas?.zoomToFit(),
            onReset: () => this.graphCanvas?.resetView()
        })
        this.addChild(this.zoomControls)

        // Side panel
        this.sidePanel = new GraphSidePanel(this.viewEl, this.app, {
            onToggleExplored: (node) => void this.handleToggleExplored(node),
            onClose: () => this.handleBackgroundClick()
        })
        this.addChild(this.sidePanel)

        // Initial render
        this.rebuildGraph()
    }

    private rebuildGraph(): void {
        const entries = this.data.data
        const exploredProperty =
            (this.config.get('exploredProperty') as string) ||
            this.plugin.settings.exploredPropertyName ||
            'explored'
        const showExternal = (this.config.get('showExternalNodes') as boolean) || false
        const exploredFilter = (this.controls?.getFilter() as ExploredFilter) || 'all'

        this.currentGraphData = buildGraphData(
            entries,
            this.app.metadataCache,
            exploredProperty,
            showExternal,
            exploredFilter
        )

        if (this.currentGraphData.nodes.length === 0) {
            if (!this.viewEl?.querySelector('.ge-empty-state')) {
                this.viewEl?.createDiv({ cls: 'ge-empty-state', text: 'No notes to display' })
            }
            return
        }
        this.viewEl?.querySelector('.ge-empty-state')?.remove()

        this.graphCanvas?.setData(this.currentGraphData)

        // Update stats
        const exploredCount = this.currentGraphData.nodes.filter(
            (n) => n.explored && !n.external
        ).length
        const unexploredCount = this.currentGraphData.nodes.filter(
            (n) => !n.explored && !n.external
        ).length
        this.controls?.updateStats({
            totalNodes: this.currentGraphData.nodes.length,
            totalLinks: this.currentGraphData.links.length,
            exploredCount,
            unexploredCount
        })

        // Apply search highlight if active
        if (this.searchQuery) {
            this.applySearchHighlight(this.searchQuery)
        }
    }

    private handleNodeClick(node: GraphNode): void {
        this.graphCanvas?.setSelectedNode(node.id)
        void this.sidePanel?.showNode(node)
    }

    private handleNodeDoubleClick(node: GraphNode): void {
        const file = this.app.vault.getAbstractFileByPath(node.id)
        if (file instanceof TFile) {
            void this.app.workspace.getLeaf('tab').openFile(file)
        }
    }

    private handleBackgroundClick(): void {
        this.graphCanvas?.setSelectedNode(null)
        this.sidePanel?.hide()
    }

    private async handleToggleExplored(node: GraphNode): Promise<void> {
        const file = this.app.vault.getAbstractFileByPath(node.id)
        if (!(file instanceof TFile)) return

        const exploredProperty = (this.config.get('exploredProperty') as string) || 'explored'
        const newExplored = !node.explored

        await setNoteExplored(this.app, file, exploredProperty, newExplored)

        // Update side panel immediately (optimistic)
        this.sidePanel?.updateExploredState(newExplored)

        log(`Toggled explored: ${node.name} -> ${String(newExplored)}`, 'debug')
    }

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
