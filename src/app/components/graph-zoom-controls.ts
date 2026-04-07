import { Component } from 'obsidian'

export interface ZoomCallbacks {
    onZoomIn: () => void
    onZoomOut: () => void
    onZoomToFit: () => void
    onReset: () => void
}

/**
 * Zoom control buttons positioned on the right side of the graph.
 */
export class GraphZoomControls extends Component {
    private controlsEl: HTMLElement

    constructor(containerEl: HTMLElement, callbacks: ZoomCallbacks) {
        super()

        this.controlsEl = containerEl.createDiv({ cls: 'ge-zoom-controls' })

        const buttons: { label: string; ariaLabel: string; callback: () => void }[] = [
            { label: '+', ariaLabel: 'Zoom in', callback: callbacks.onZoomIn },
            { label: '−', ariaLabel: 'Zoom out', callback: callbacks.onZoomOut },
            { label: '⊡', ariaLabel: 'Fit to screen', callback: callbacks.onZoomToFit },
            { label: '⟲', ariaLabel: 'Reset view', callback: callbacks.onReset }
        ]

        for (const b of buttons) {
            const btn = this.controlsEl.createEl('button', {
                text: b.label,
                cls: 'ge-zoom-controls__btn clickable-icon',
                attr: { 'aria-label': b.ariaLabel, 'title': b.ariaLabel }
            })
            this.registerDomEvent(btn, 'click', b.callback)
        }
    }

    override onunload(): void {
        this.controlsEl.remove()
    }
}
