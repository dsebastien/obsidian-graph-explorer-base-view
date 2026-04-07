import { Component, MarkdownRenderer, TFile } from 'obsidian'
import type { App } from 'obsidian'
import type { GraphNode } from '../types/graph-types'

export interface GraphSidePanelCallbacks {
    onToggleExplored: (node: GraphNode) => void
    onClose: () => void
}

/**
 * Right-side panel showing the selected note with full rendered content.
 */
export class GraphSidePanel extends Component {
    private panelEl: HTMLElement
    private headerEl: HTMLElement
    private contentEl: HTMLElement
    private app: App
    private callbacks: GraphSidePanelCallbacks
    private currentNode: GraphNode | null = null
    private renderComponent: Component | null = null

    constructor(containerEl: HTMLElement, app: App, callbacks: GraphSidePanelCallbacks) {
        super()
        this.app = app
        this.callbacks = callbacks

        this.panelEl = containerEl.createDiv({ cls: 'ge-side-panel ge-side-panel--hidden' })
        this.headerEl = this.panelEl.createDiv({ cls: 'ge-side-panel__header' })
        this.contentEl = this.panelEl.createDiv({ cls: 'ge-side-panel__content' })
    }

    override onunload(): void {
        this.renderComponent?.unload()
        this.renderComponent = null
        this.panelEl.remove()
    }

    async showNode(node: GraphNode): Promise<void> {
        this.currentNode = node
        const file = this.app.vault.getAbstractFileByPath(node.id)
        if (!(file instanceof TFile)) return

        this.panelEl.removeClass('ge-side-panel--hidden')

        this.renderHeader(node)
        await this.renderContent(file)
    }

    hide(): void {
        this.panelEl.addClass('ge-side-panel--hidden')
        this.currentNode = null
        this.clearContent()
    }

    isVisible(): boolean {
        return !this.panelEl.hasClass('ge-side-panel--hidden')
    }

    getCurrentNode(): GraphNode | null {
        return this.currentNode
    }

    updateExploredState(explored: boolean): void {
        if (!this.currentNode) return
        this.currentNode = { ...this.currentNode, explored }
        this.renderHeader(this.currentNode)
    }

    private renderHeader(node: GraphNode): void {
        this.headerEl.empty()

        const titleRow = this.headerEl.createDiv({ cls: 'ge-side-panel__title-row' })

        const titleEl = titleRow.createDiv({ cls: 'ge-side-panel__title' })
        titleEl.createSpan({ text: node.name, cls: 'ge-side-panel__name' })
        if (node.explored) {
            titleEl.createSpan({ text: ' (explored)', cls: 'ge-side-panel__explored-badge' })
        }
        if (node.external) {
            titleEl.createSpan({ text: ' (external)', cls: 'ge-side-panel__external-badge' })
        }

        const actionsEl = titleRow.createDiv({ cls: 'ge-side-panel__actions' })

        if (!node.external) {
            const toggleBtn = actionsEl.createEl('button', {
                cls: 'ge-side-panel__toggle-explored clickable-icon',
                attr: { 'aria-label': node.explored ? 'Mark as unexplored' : 'Mark as explored' }
            })
            toggleBtn.textContent = node.explored ? '✓ Explored' : '○ Mark explored'
            if (node.explored) {
                toggleBtn.addClass('ge-side-panel__toggle-explored--active')
            }
            this.registerDomEvent(toggleBtn, 'click', () => {
                if (this.currentNode) {
                    this.callbacks.onToggleExplored(this.currentNode)
                }
            })
        }

        const closeBtn = actionsEl.createEl('button', {
            cls: 'ge-side-panel__close clickable-icon',
            attr: { 'aria-label': 'Close panel' }
        })
        closeBtn.textContent = '✕'
        this.registerDomEvent(closeBtn, 'click', () => {
            this.callbacks.onClose()
        })
    }

    private async renderContent(file: TFile): Promise<void> {
        this.clearContent()

        const content = await this.app.vault.cachedRead(file)
        this.renderComponent = new Component()
        this.renderComponent.load()

        await MarkdownRenderer.render(
            this.app,
            content,
            this.contentEl,
            file.path,
            this.renderComponent
        )
    }

    private clearContent(): void {
        this.renderComponent?.unload()
        this.renderComponent = null
        this.contentEl.empty()
    }
}
