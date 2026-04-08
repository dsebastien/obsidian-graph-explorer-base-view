import { Component } from 'obsidian'

export interface LegendEntry {
    color: string
    label: string
}

export interface LegendConfig {
    title: string
    entries: LegendEntry[]
}

/**
 * Toggleable color legend panel displayed near the zoom controls.
 * Shows what colors mean based on the current color-by mode.
 */
export class GraphLegend extends Component {
    private toggleBtn: HTMLElement
    private panelEl: HTMLElement
    private visible = false

    constructor(containerEl: HTMLElement) {
        super()

        this.toggleBtn = containerEl.createEl('button', {
            text: '\u25A3',
            cls: 'ge-legend__toggle clickable-icon',
            attr: { 'aria-label': 'Toggle color legend', 'title': 'Toggle color legend' }
        })
        this.registerDomEvent(this.toggleBtn, 'click', () => this.toggle())

        this.panelEl = containerEl.createDiv({ cls: 'ge-legend ge-legend--hidden' })
    }

    override onunload(): void {
        this.toggleBtn.remove()
        this.panelEl.remove()
    }

    update(config: LegendConfig): void {
        this.panelEl.empty()

        const titleEl = this.panelEl.createDiv({ cls: 'ge-legend__title' })
        titleEl.textContent = config.title

        for (const entry of config.entries) {
            const row = this.panelEl.createDiv({ cls: 'ge-legend__entry' })
            const swatch = row.createDiv({ cls: 'ge-legend__swatch' })
            swatch.style.backgroundColor = entry.color
            row.createSpan({ text: entry.label, cls: 'ge-legend__label' })
        }
    }

    private toggle(): void {
        this.visible = !this.visible
        if (this.visible) {
            this.panelEl.removeClass('ge-legend--hidden')
            this.toggleBtn.addClass('ge-legend__toggle--active')
        } else {
            this.panelEl.addClass('ge-legend--hidden')
            this.toggleBtn.removeClass('ge-legend__toggle--active')
        }
    }
}
