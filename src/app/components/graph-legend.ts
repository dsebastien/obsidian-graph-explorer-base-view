import { Component } from 'obsidian'

export interface LegendEntry {
    color: string
    label: string
    /** 'swatch' = filled circle (default), 'ring' = hollow ring, 'dot' = small dot */
    style?: 'swatch' | 'ring' | 'dot'
}

export interface LegendSection {
    title: string
    entries: LegendEntry[]
}

export interface LegendConfig {
    sections: LegendSection[]
}

/**
 * Toggleable legend panel displayed near the zoom controls.
 * Shows what colors, rings, and indicators mean.
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
            attr: { 'aria-label': 'Toggle legend', 'title': 'Toggle legend' }
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

        for (const section of config.sections) {
            if (section.entries.length === 0) continue
            const sectionEl = this.panelEl.createDiv({ cls: 'ge-legend__section' })
            sectionEl.createDiv({ cls: 'ge-legend__title', text: section.title })

            for (const entry of section.entries) {
                const row = sectionEl.createDiv({ cls: 'ge-legend__entry' })
                const indicatorStyle = entry.style ?? 'swatch'
                const indicator = row.createDiv({
                    cls: `ge-legend__indicator ge-legend__indicator--${indicatorStyle}`
                })
                indicator.style.borderColor = entry.color
                if (indicatorStyle === 'swatch' || indicatorStyle === 'dot') {
                    indicator.style.backgroundColor = entry.color
                }
                row.createSpan({ text: entry.label, cls: 'ge-legend__label' })
            }
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
