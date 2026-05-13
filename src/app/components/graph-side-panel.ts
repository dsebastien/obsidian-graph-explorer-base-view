import { Component, MarkdownRenderer, TFile } from 'obsidian'
import type { App } from 'obsidian'
import type { GraphNode, MaturityLevel } from '../types/graph-types'

export interface GraphSidePanelCallbacks {
    onToggleExplored: (node: GraphNode) => void
    onSetMaturity: (node: GraphNode, maturity: MaturityLevel) => void
    onClose: () => void
    onNavigateToNode: (nodeId: string) => void
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
    private graphNodePaths: Set<string> = new Set()
    private currentMarkdown = ''

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
        this.contentEl.scrollTop = 0

        // Frontier nodes have no file
        if (node.frontier) {
            this.currentMarkdown = ''
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

    setGraphNodePaths(paths: Set<string>): void {
        this.graphNodePaths = paths
    }

    updateExploredState(explored: boolean): void {
        if (!this.currentNode) return
        this.currentNode = { ...this.currentNode, explored }
        this.renderHeader(this.currentNode)
    }

    updateMaturityState(maturity: MaturityLevel): void {
        if (!this.currentNode) return
        this.currentNode = { ...this.currentNode, maturity }
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
            activeDocument.removeEventListener('mousemove', onMouseMove)
            activeDocument.removeEventListener('mouseup', onMouseUp)
            activeDocument.body.removeClass('ge-resizing')
        }

        handle.addEventListener('mousedown', (e: MouseEvent) => {
            e.preventDefault()
            startX = e.clientX
            startWidth = this.panelEl.getBoundingClientRect().width
            activeDocument.body.addClass('ge-resizing')
            activeDocument.addEventListener('mousemove', onMouseMove)
            activeDocument.addEventListener('mouseup', onMouseUp)
        })
    }

    private renderHeader(node: GraphNode): void {
        this.headerEl.empty()

        // Row 1: Title + close
        const titleRow = this.headerEl.createDiv({ cls: 'ge-side-panel__title-row' })
        const titleEl = titleRow.createDiv({ cls: 'ge-side-panel__title' })
        const nameEl = titleEl.createSpan({
            text: node.name,
            cls: 'ge-side-panel__name',
            attr: { title: 'Click to open in new tab' }
        })
        if (!node.frontier) {
            nameEl.addClass('ge-side-panel__name--clickable')
            nameEl.addEventListener('click', () => {
                const file = this.app.vault.getAbstractFileByPath(node.id)
                if (file instanceof TFile) {
                    void this.app.workspace.getLeaf('tab').openFile(file)
                }
            })
        }

        const closeBtn = titleRow.createEl('button', {
            cls: 'ge-side-panel__close clickable-icon',
            attr: { 'aria-label': 'Close panel', 'title': 'Close panel' }
        })
        closeBtn.textContent = '\u2715'
        this.registerDomEvent(closeBtn, 'click', () => {
            this.callbacks.onClose()
        })

        // Row 2: Badges/pills
        const badgesEl = this.headerEl.createDiv({ cls: 'ge-side-panel__badges' })

        if (node.external) {
            badgesEl.createSpan({
                text: 'external',
                cls: 'ge-side-panel__badge ge-side-panel__external-badge',
                attr: { title: 'This note is outside the current Base filter' }
            })
        }
        if (node.frontier) {
            badgesEl.createSpan({
                text: 'frontier',
                cls: 'ge-side-panel__badge ge-side-panel__frontier-badge',
                attr: { title: 'This note does not exist yet (unresolved link)' }
            })
        }
        if (node.wikiRole !== 'unknown') {
            const roleDescriptions: Record<string, string> = {
                article: 'Wiki article: a knowledge entry',
                index: 'Wiki index: table of contents for the wiki',
                log: 'Wiki log: change history and activity record',
                source_summary: 'Source summary: digest of an ingested source'
            }
            badgesEl.createSpan({
                text: node.wikiRole.replace(/_/g, ' '),
                cls: `ge-side-panel__badge ge-side-panel__role-badge ge-side-panel__role-badge--${node.wikiRole}`,
                attr: { title: roleDescriptions[node.wikiRole] ?? node.wikiRole }
            })
        }
        if (node.confidence !== 'unknown') {
            const confDescriptions: Record<string, string> = {
                high: 'High confidence: well-sourced and cross-referenced',
                medium: 'Medium confidence: partially verified',
                low: 'Low confidence: needs more sources',
                uncertain: 'Uncertain: speculative or unverified'
            }
            badgesEl.createSpan({
                text: node.confidence,
                cls: `ge-side-panel__badge ge-side-panel__confidence-badge ge-side-panel__confidence-badge--${node.confidence}`,
                attr: { title: confDescriptions[node.confidence] ?? node.confidence }
            })
        }
        if (node.graduatedNotes.length > 0) {
            badgesEl.createSpan({
                text: `${node.graduatedNotes.length} graduated`,
                cls: 'ge-side-panel__badge ge-side-panel__graduated-badge',
                attr: {
                    title: `Graduated notes: ${node.graduatedNotes.join(', ')}`
                }
            })
        }
        if (node.tags.length > 0) {
            for (const tag of node.tags.slice(0, 5)) {
                badgesEl.createSpan({
                    text: tag,
                    cls: 'ge-side-panel__badge ge-side-panel__tag',
                    attr: { title: `Tag: ${tag}` }
                })
            }
        }

        // Row 3: Action buttons
        const actionsEl = this.headerEl.createDiv({ cls: 'ge-side-panel__actions' })

        if (!node.external && !node.frontier) {
            const toggleBtn = actionsEl.createEl('button', {
                cls: 'ge-side-panel__toggle-explored',
                attr: {
                    'aria-label': node.explored ? 'Mark as unexplored' : 'Mark as explored',
                    'title': node.explored ? 'Mark as unexplored' : 'Mark as explored'
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

        if (!node.external && !node.frontier) {
            const maturitySelect = actionsEl.createEl('select', {
                cls: `ge-side-panel__maturity-select ge-side-panel__maturity-select--${node.maturity}`,
                attr: {
                    'aria-label': 'Set maturity level',
                    'title': 'Set maturity level'
                }
            })
            const levels: { value: MaturityLevel; label: string }[] = [
                { value: 'unknown', label: 'No maturity' },
                { value: 'stub', label: '\u{1F7E0} Stub' },
                { value: 'draft', label: '\u{1F7E1} Draft' },
                { value: 'substantial', label: '\u{1F535} Substantial' },
                { value: 'mature', label: '\u{1F7E2} Mature' }
            ]
            for (const level of levels) {
                const option = maturitySelect.createEl('option', {
                    text: level.label,
                    value: level.value
                })
                if (level.value === node.maturity) {
                    option.selected = true
                }
            }
            this.registerDomEvent(maturitySelect, 'change', () => {
                if (this.currentNode) {
                    const val = maturitySelect.value as MaturityLevel
                    this.callbacks.onSetMaturity(this.currentNode, val)
                    // Update styling to match new value
                    maturitySelect.className = `ge-side-panel__maturity-select ge-side-panel__maturity-select--${val}`
                }
            })
        }

        if (!node.frontier) {
            const copyBtn = actionsEl.createEl('button', {
                text: '\u2398 Copy md',
                cls: 'ge-side-panel__copy-btn',
                attr: {
                    'aria-label': 'Copy note content as markdown',
                    'title': 'Copy note content as markdown'
                }
            })
            this.registerDomEvent(copyBtn, 'click', () => {
                if (this.currentMarkdown) {
                    void navigator.clipboard.writeText(this.currentMarkdown)
                    copyBtn.textContent = '\u2713 Copied!'
                    window.setTimeout(() => {
                        copyBtn.textContent = '\u2398 Copy md'
                    }, 1500)
                }
            })
        }
    }

    private async renderContent(file: TFile): Promise<void> {
        this.clearContent()

        const content = await this.app.vault.cachedRead(file)
        // Strip frontmatter for copy
        this.currentMarkdown = content.replace(/^---\n[\s\S]*?\n---\n*/, '').trim()
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
        // Left-click: navigate in-panel if target is a graph node, otherwise open in tab
        // Middle-click: always open in new tab
        this.contentEl.querySelectorAll('a.internal-link').forEach((el) => {
            el.addEventListener('click', (e) => {
                e.preventDefault()
                const href = el.getAttribute('href')
                if (!href) return
                const target = this.app.metadataCache.getFirstLinkpathDest(href, file.path)
                if (!(target instanceof TFile)) return

                if (this.graphNodePaths.has(target.path)) {
                    // Navigate within the panel
                    this.callbacks.onNavigateToNode(target.path)
                } else {
                    // Open in new tab
                    void this.app.workspace.getLeaf('tab').openFile(target)
                }
            })
            el.addEventListener('auxclick', (e) => {
                if ((e as MouseEvent).button !== 1) return
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
