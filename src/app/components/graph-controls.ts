import { Component, debounce } from 'obsidian'
import type { Debouncer } from 'obsidian'
import type {
    ExploredFilter,
    GraphStats,
    ConfidenceLevel,
    MaturityLevel
} from '../types/graph-types'

export interface GraphControlsCallbacks {
    onSearchChange: (query: string) => void
    onExploredFilterChange: (filter: ExploredFilter) => void
    onBatchToggleExplored: () => void
    onBatchSetMaturity: (maturity: MaturityLevel) => void
    onNodeSpacingChange: (spacing: number) => void
    onNodeScaleChange: (scale: number) => void
    onTextScaleChange: (scale: number) => void
}

/**
 * Overlay controls for search, filtering, and stats on the graph.
 */
export class GraphControls extends Component {
    private controlsEl: HTMLElement
    private bodyEl: HTMLElement
    private statsEl: HTMLElement
    private progressEl: HTMLElement
    private batchActionsEl: HTMLElement
    private searchInput: HTMLInputElement
    private spacingSlider: HTMLInputElement
    private spacingValue: HTMLSpanElement
    private scaleSlider: HTMLInputElement
    private scaleValue: HTMLSpanElement
    private textSlider: HTMLInputElement
    private textValue: HTMLSpanElement
    private callbacks: GraphControlsCallbacks
    private currentFilter: ExploredFilter = 'all'
    private debouncedSearch: Debouncer<[string], void>
    private collapsed = false

    constructor(containerEl: HTMLElement, callbacks: GraphControlsCallbacks) {
        super()
        this.callbacks = callbacks
        this.debouncedSearch = debounce((query: string) => {
            this.callbacks.onSearchChange(query)
        }, 300)

        this.controlsEl = containerEl.createDiv({ cls: 'ge-controls' })

        // Header with collapse toggle
        const header = this.controlsEl.createDiv({ cls: 'ge-controls__header' })
        header.createSpan({ text: 'Graph', cls: 'ge-controls__header-title' })
        const collapseBtn = header.createEl('button', {
            cls: 'ge-controls__collapse-btn clickable-icon',
            attr: { 'title': 'Toggle controls', 'aria-label': 'Toggle controls' }
        })
        collapseBtn.textContent = '\u25B2'
        header.addEventListener('click', () => {
            this.collapsed = !this.collapsed
            this.bodyEl.toggleClass('ge-controls__body--hidden', this.collapsed)
            collapseBtn.textContent = this.collapsed ? '\u25BC' : '\u25B2'
        })

        // Collapsible body
        this.bodyEl = this.controlsEl.createDiv({ cls: 'ge-controls__body' })

        // Search
        const searchSection = this.bodyEl.createDiv({ cls: 'ge-controls__search' })
        this.searchInput = searchSection.createEl('input', {
            type: 'search',
            placeholder: 'Search notes...',
            cls: 'ge-controls__search-input'
        })

        // Stats
        this.statsEl = this.bodyEl.createDiv({ cls: 'ge-controls__stats' })

        // Progress bar
        this.progressEl = this.bodyEl.createDiv({ cls: 'ge-controls__progress' })

        // Sliders
        const slidersSection = this.bodyEl.createDiv({ cls: 'ge-controls__sliders' })

        // Spacing slider
        const spacingRow = slidersSection.createDiv({ cls: 'ge-controls__slider-row' })
        spacingRow.createSpan({ text: 'Spacing', cls: 'ge-controls__slider-label' })
        this.spacingValue = spacingRow.createSpan({
            cls: 'ge-controls__slider-value ge-controls__slider-value--hidden'
        })
        this.spacingSlider = spacingRow.createEl('input', {
            type: 'range',
            cls: 'ge-controls__slider',
            attr: { min: '200', max: '5000', step: '100', title: 'Node spacing' }
        })
        this.spacingSlider.value = '1500'

        // Scale slider
        const scaleRow = slidersSection.createDiv({ cls: 'ge-controls__slider-row' })
        scaleRow.createSpan({ text: 'Size', cls: 'ge-controls__slider-label' })
        this.scaleValue = scaleRow.createSpan({
            cls: 'ge-controls__slider-value ge-controls__slider-value--hidden'
        })
        this.scaleSlider = scaleRow.createEl('input', {
            type: 'range',
            cls: 'ge-controls__slider',
            attr: { min: '20', max: '300', step: '10', title: 'Node size' }
        })
        this.scaleSlider.value = '100'

        // Text scale slider
        const textRow = slidersSection.createDiv({ cls: 'ge-controls__slider-row' })
        textRow.createSpan({ text: 'Text', cls: 'ge-controls__slider-label' })
        this.textValue = textRow.createSpan({
            cls: 'ge-controls__slider-value ge-controls__slider-value--hidden'
        })
        this.textSlider = textRow.createEl('input', {
            type: 'range',
            cls: 'ge-controls__slider',
            attr: { min: '20', max: '300', step: '10', title: 'Label size' }
        })
        this.textSlider.value = '100'

        // Explored filter
        const filterSection = this.bodyEl.createDiv({ cls: 'ge-controls__filter' })
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
        this.batchActionsEl = this.bodyEl.createDiv({
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

        const batchMaturitySelect = this.batchActionsEl.createEl('select', {
            cls: 'ge-controls__batch-maturity-select',
            attr: { title: 'Set maturity level on all selected nodes' }
        })
        batchMaturitySelect.createEl('option', { text: 'Set maturity\u2026', value: '' })
        const levels: { value: MaturityLevel; label: string }[] = [
            { value: 'stub', label: 'Stub' },
            { value: 'draft', label: 'Draft' },
            { value: 'substantial', label: 'Substantial' },
            { value: 'mature', label: 'Mature' }
        ]
        for (const level of levels) {
            batchMaturitySelect.createEl('option', { text: level.label, value: level.value })
        }
        this.registerDomEvent(batchMaturitySelect, 'change', () => {
            const val = batchMaturitySelect.value as MaturityLevel
            if (val) {
                this.callbacks.onBatchSetMaturity(val)
                batchMaturitySelect.value = ''
            }
        })
    }

    override onload(): void {
        this.registerDomEvent(this.searchInput, 'input', () => {
            this.debouncedSearch(this.searchInput.value)
        })

        // Spacing slider — show value while dragging
        this.registerDomEvent(this.spacingSlider, 'input', () => {
            const val = parseInt(this.spacingSlider.value, 10)
            this.spacingValue.textContent = String(val)
            this.spacingValue.removeClass('ge-controls__slider-value--hidden')
            this.callbacks.onNodeSpacingChange(val)
        })
        this.registerDomEvent(this.spacingSlider, 'change', () => {
            setTimeout(() => {
                this.spacingValue.addClass('ge-controls__slider-value--hidden')
            }, 800)
        })

        // Scale slider — show value while dragging
        this.registerDomEvent(this.scaleSlider, 'input', () => {
            const val = parseInt(this.scaleSlider.value, 10)
            this.scaleValue.textContent = `${val}%`
            this.scaleValue.removeClass('ge-controls__slider-value--hidden')
            this.callbacks.onNodeScaleChange(val)
        })
        this.registerDomEvent(this.scaleSlider, 'change', () => {
            setTimeout(() => {
                this.scaleValue.addClass('ge-controls__slider-value--hidden')
            }, 800)
        })

        // Text slider — show value while dragging
        this.registerDomEvent(this.textSlider, 'input', () => {
            const val = parseInt(this.textSlider.value, 10)
            this.textValue.textContent = `${val}%`
            this.textValue.removeClass('ge-controls__slider-value--hidden')
            this.callbacks.onTextScaleChange(val)
        })
        this.registerDomEvent(this.textSlider, 'change', () => {
            setTimeout(() => {
                this.textValue.addClass('ge-controls__slider-value--hidden')
            }, 800)
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
        if (stats.frontierCount > 0) {
            this.statsEl.createSpan({
                text: `${stats.frontierCount} frontier`,
                cls: 'ge-controls__stat ge-controls__stat--frontier'
            })
        }

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
            this.renderConfidenceDistribution(stats)
            this.renderMaturityDistribution(stats)
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

    private renderMaturityDistribution(stats: GraphStats): void {
        const maturityLevels: MaturityLevel[] = ['mature', 'substantial', 'draft', 'stub']
        const hasAnyMaturity = maturityLevels.some((m) => stats.maturityDistribution[m] > 0)
        if (!hasAnyMaturity) return

        const distEl = this.progressEl.createDiv({
            cls: 'ge-controls__maturity-dist'
        })
        for (const level of maturityLevels) {
            const count = stats.maturityDistribution[level]
            if (count > 0) {
                distEl.createSpan({
                    text: `${count}`,
                    cls: `ge-controls__maturity-dot ge-controls__maturity-dot--${level}`,
                    attr: { title: `${level}: ${count}` }
                })
            }
        }
        if (stats.graduatedCount > 0) {
            distEl.createSpan({
                text: `${stats.graduatedCount}`,
                cls: 'ge-controls__maturity-dot ge-controls__maturity-dot--graduated',
                attr: { title: `graduated: ${stats.graduatedCount}` }
            })
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

    setSpacingValue(value: number): void {
        this.spacingSlider.value = String(value)
    }

    setScaleValue(value: number): void {
        this.scaleSlider.value = String(value)
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
