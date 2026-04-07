import { Component, debounce } from 'obsidian'
import type { Debouncer } from 'obsidian'
import type { ExploredFilter } from '../types/graph-types'

export interface GraphControlsCallbacks {
    onSearchChange: (query: string) => void
    onExploredFilterChange: (filter: ExploredFilter) => void
}

export interface GraphStats {
    totalNodes: number
    totalLinks: number
    exploredCount: number
    unexploredCount: number
}

/**
 * Overlay controls for search and filtering on the graph.
 */
export class GraphControls extends Component {
    private controlsEl: HTMLElement
    private statsEl: HTMLElement
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

        // Explored filter
        const filterSection = this.controlsEl.createDiv({ cls: 'ge-controls__filter' })
        filterSection.createDiv({ cls: 'ge-controls__filter-label', text: 'Show:' })
        const filterBtns = filterSection.createDiv({ cls: 'ge-controls__filter-buttons' })

        const filters: { key: ExploredFilter; label: string }[] = [
            { key: 'all', label: 'All' },
            { key: 'explored', label: 'Explored' },
            { key: 'unexplored', label: 'New' }
        ]

        for (const f of filters) {
            const btn = filterBtns.createEl('button', {
                text: f.label,
                cls: `ge-controls__filter-btn${f.key === 'all' ? ' ge-controls__filter-btn--active' : ''}`,
                attr: { 'data-filter': f.key }
            })
            this.registerDomEvent(btn, 'click', () => {
                this.setFilter(f.key)
            })
        }
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
}
