import { Component, MarkdownRenderer, TFile } from 'obsidian'
import type { App } from 'obsidian'
import type { GraphNode } from '../types/graph-types'

export interface GraphSidePanelCallbacks {
    onToggleExplored: (node: GraphNode) => void
    onClose: () => void
}

/**
 * Right-side panel showing the selected note with rendered content,
 * wiki role, confidence, and tags.
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

        // Resize handle
        const resizeHandle = this.panelEl.createDiv({ cls: 'ge-side-panel__resize-handle' })
        this.setupResize(resizeHandle)

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

        // Frontier nodes have no file
        if (node.frontier) {
            this.panelEl.removeClass('ge-side-panel--hidden')
            this.renderHeader(node)
            this.clearContent()
            this.contentEl.createDiv({
                cls: 'ge-side-panel__frontier-notice',
                text: 'This note does not exist yet. It is referenced by other notes in the graph.'
            })
            return
        }

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

    private setupResize(handle: HTMLElement): void {
        let startX = 0
        let startWidth = 0

        const onMouseMove = (e: MouseEvent) => {
            const delta = startX - e.clientX
            const newWidth = Math.max(240, Math.min(startWidth + delta, window.innerWidth * 0.7))
            this.panelEl.style.width = `${newWidth}px`
        }

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove)
            document.removeEventListener('mouseup', onMouseUp)
            document.body.removeClass('ge-resizing')
        }

        handle.addEventListener('mousedown', (e: MouseEvent) => {
            e.preventDefault()
            startX = e.clientX
            startWidth = this.panelEl.getBoundingClientRect().width
            document.body.addClass('ge-resizing')
            document.addEventListener('mousemove', onMouseMove)
            document.addEventListener('mouseup', onMouseUp)
        })
    }

    private renderHeader(node: GraphNode): void {
        this.headerEl.empty()

        const titleRow = this.headerEl.createDiv({ cls: 'ge-side-panel__title-row' })

        // Title
        const titleEl = titleRow.createDiv({ cls: 'ge-side-panel__title' })
        titleEl.createSpan({ text: node.name, cls: 'ge-side-panel__name' })

        // Actions
        const actionsEl = titleRow.createDiv({ cls: 'ge-side-panel__actions' })

        if (!node.external && !node.frontier) {
            const toggleBtn = actionsEl.createEl('button', {
                cls: 'ge-side-panel__toggle-explored clickable-icon',
                attr: {
                    'aria-label': node.explored ? 'Mark as unexplored' : 'Mark as explored'
                }
            })
            toggleBtn.textContent = node.explored ? '\u2713 Explored' : '\u25CB Mark explored'
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
        closeBtn.textContent = '\u2715'
        this.registerDomEvent(closeBtn, 'click', () => {
            this.callbacks.onClose()
        })

        // Badge row
        const badgesEl = this.headerEl.createDiv({ cls: 'ge-side-panel__badges' })

        if (node.explored) {
            badgesEl.createSpan({
                text: 'explored',
                cls: 'ge-side-panel__badge ge-side-panel__explored-badge'
            })
        }
        if (node.external) {
            badgesEl.createSpan({
                text: 'external',
                cls: 'ge-side-panel__badge ge-side-panel__external-badge'
            })
        }
        if (node.frontier) {
            badgesEl.createSpan({
                text: 'frontier',
                cls: 'ge-side-panel__badge ge-side-panel__frontier-badge'
            })
        }
        if (node.wikiRole !== 'unknown') {
            badgesEl.createSpan({
                text: node.wikiRole.replace(/_/g, ' '),
                cls: `ge-side-panel__badge ge-side-panel__role-badge ge-side-panel__role-badge--${node.wikiRole}`
            })
        }
        if (node.confidence !== 'unknown') {
            badgesEl.createSpan({
                text: node.confidence,
                cls: `ge-side-panel__badge ge-side-panel__confidence-badge ge-side-panel__confidence-badge--${node.confidence}`
            })
        }

        // Tags
        if (node.tags.length > 0) {
            const tagsEl = this.headerEl.createDiv({ cls: 'ge-side-panel__tags' })
            for (const tag of node.tags.slice(0, 5)) {
                tagsEl.createSpan({ text: tag, cls: 'ge-side-panel__tag' })
            }
        }
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

        // Make internal links clickable
        this.contentEl.querySelectorAll('a.internal-link').forEach((el) => {
            el.addEventListener('click', (e) => {
                e.preventDefault()
                const href = el.getAttribute('href')
                if (!href) return
                const target = this.app.metadataCache.getFirstLinkpathDest(href, file.path)
                if (target instanceof TFile) {
                    void this.app.workspace.getLeaf('tab').openFile(target)
                }
            })
        })

        // Make external links clickable
        this.contentEl.querySelectorAll('a.external-link').forEach((el) => {
            el.addEventListener('click', (e) => {
                e.preventDefault()
                const href = el.getAttribute('href')
                if (href) window.open(href)
            })
        })
    }

    private clearContent(): void {
        this.renderComponent?.unload()
        this.renderComponent = null
        this.contentEl.empty()
    }
}
