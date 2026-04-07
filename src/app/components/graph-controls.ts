import { Component, debounce } from 'obsidian'
import type { Debouncer } from 'obsidian'
import type { ExploredFilter, GraphStats, ConfidenceLevel } from '../types/graph-types'

export interface GraphControlsCallbacks {
    onSearchChange: (query: string) => void
    onExploredFilterChange: (filter: ExploredFilter) => void
    onBatchToggleExplored: () => void
}

/**
 * Overlay controls for search, filtering, and stats on the graph.
 * Includes extended progress dashboard with confidence distribution.
 */
export class GraphControls extends Component {
    private controlsEl: HTMLElement
    private statsEl: HTMLElement
    private progressEl: HTMLElement
    private batchActionsEl: HTMLElement
    private searchInput: HTMLInputElement
    private callbacks: GraphControlsCallbacks
    private currentFilter: ExploredFilter = 'all'
    private debouncedSearch: Debouncer<[string], void>

    constructor(containerEl: HTMLElement, callbacks: GraphControlsCallbacks) {
        super()
        this.callbacks = callbacks
        this.debouncedSearch = debounce((query: string) => {
            this.callbacks.onSearchChange(query)
        }, 300)

        this.controlsEl = containerEl.createDiv({ cls: 'ge-controls' })

        // Search
        const searchSection = this.controlsEl.createDiv({ cls: 'ge-controls__search' })
        this.searchInput = searchSection.createEl('input', {
            type: 'search',
            placeholder: 'Search notes...',
            cls: 'ge-controls__search-input'
        })

        // Stats
        this.statsEl = this.controlsEl.createDiv({ cls: 'ge-controls__stats' })

        // Progress bar
        this.progressEl = this.controlsEl.createDiv({ cls: 'ge-controls__progress' })

        // Explored filter
        const filterSection = this.controlsEl.createDiv({ cls: 'ge-controls__filter' })
        filterSection.createDiv({ cls: 'ge-controls__filter-label', text: 'Show:' })
        const filterBtns = filterSection.createDiv({ cls: 'ge-controls__filter-buttons' })

        const filters: { key: ExploredFilter; label: string; tooltip: string }[] = [
            { key: 'all', label: 'All', tooltip: 'Show all notes' },
            { key: 'explored', label: 'Explored', tooltip: 'Show only explored notes' },
            { key: 'unexplored', label: 'New', tooltip: 'Show only unexplored notes' }
        ]

        for (const f of filters) {
            const btn = filterBtns.createEl('button', {
                text: f.label,
                cls: `ge-controls__filter-btn${f.key === 'all' ? ' ge-controls__filter-btn--active' : ''}`,
                attr: { 'data-filter': f.key, 'title': f.tooltip }
            })
            this.registerDomEvent(btn, 'click', () => {
                this.setFilter(f.key)
            })
        }

        // Batch actions (hidden by default)
        this.batchActionsEl = this.controlsEl.createDiv({
            cls: 'ge-controls__batch ge-controls__batch--hidden'
        })
        const batchToggleBtn = this.batchActionsEl.createEl('button', {
            text: 'Toggle explored',
            cls: 'ge-controls__batch-btn',
            attr: { title: 'Toggle explored status on all selected nodes' }
        })
        this.registerDomEvent(batchToggleBtn, 'click', () => {
            this.callbacks.onBatchToggleExplored()
        })
    }

    override onload(): void {
        this.registerDomEvent(this.searchInput, 'input', () => {
            this.debouncedSearch(this.searchInput.value)
        })
    }

    override onunload(): void {
        this.controlsEl.remove()
    }

    updateStats(stats: GraphStats): void {
        // Basic stats
        this.statsEl.empty()
        this.statsEl.createSpan({
            text: `${stats.totalNodes} notes`,
            cls: 'ge-controls__stat'
        })
        this.statsEl.createSpan({
            text: `${stats.totalLinks} links`,
            cls: 'ge-controls__stat'
        })
        this.statsEl.createSpan({
            text: `${stats.exploredCount}/${stats.exploredCount + stats.unexploredCount} explored`,
            cls: 'ge-controls__stat'
        })
        if (stats.frontierCount > 0) {
            this.statsEl.createSpan({
                text: `${stats.frontierCount} frontier`,
                cls: 'ge-controls__stat ge-controls__stat--frontier'
            })
        }

        // Progress bar
        this.progressEl.empty()
        if (stats.exploredCount + stats.unexploredCount > 0) {
            const barContainer = this.progressEl.createDiv({
                cls: 'ge-controls__progress-bar'
            })
            const fill = barContainer.createDiv({
                cls: 'ge-controls__progress-fill'
            })
            fill.style.width = `${stats.coveragePercent}%`
            this.progressEl.createSpan({
                text: `${stats.coveragePercent}% explored`,
                cls: 'ge-controls__progress-label'
            })

            // Confidence distribution dots
            this.renderConfidenceDistribution(stats)
        }
    }

    private renderConfidenceDistribution(stats: GraphStats): void {
        const confidenceLevels: ConfidenceLevel[] = ['high', 'medium', 'low', 'uncertain']
        const hasAnyConfidence = confidenceLevels.some((c) => stats.confidenceDistribution[c] > 0)
        if (!hasAnyConfidence) return

        const distEl = this.progressEl.createDiv({
            cls: 'ge-controls__confidence-dist'
        })
        for (const level of confidenceLevels) {
            const count = stats.confidenceDistribution[level]
            if (count > 0) {
                distEl.createSpan({
                    text: `${count}`,
                    cls: `ge-controls__confidence-dot ge-controls__confidence-dot--${level}`,
                    attr: { title: `${level}: ${count}` }
                })
            }
        }
    }

    setFilter(filter: ExploredFilter): void {
        this.currentFilter = filter
        const buttons = this.controlsEl.querySelectorAll('.ge-controls__filter-btn')
        buttons.forEach((btn) => {
            const el = btn as HTMLElement
            if (el.dataset['filter'] === filter) {
                el.addClass('ge-controls__filter-btn--active')
            } else {
                el.removeClass('ge-controls__filter-btn--active')
            }
        })
        this.callbacks.onExploredFilterChange(filter)
    }

    getFilter(): ExploredFilter {
        return this.currentFilter
    }

    setBatchSelectionCount(count: number): void {
        if (count > 0) {
            this.batchActionsEl.removeClass('ge-controls__batch--hidden')
            const label = this.batchActionsEl.querySelector('.ge-controls__batch-label')
            if (label) {
                label.textContent = `${count} selected`
            } else {
                this.batchActionsEl.createSpan({
                    text: `${count} selected`,
                    cls: 'ge-controls__batch-label'
                })
            }
        } else {
            this.batchActionsEl.addClass('ge-controls__batch--hidden')
        }
    }
}
