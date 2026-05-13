import { Component } from 'obsidian'
import type { GraphNode } from '../types/graph-types'

export interface ContextMenuAction {
    label: string
    icon?: string
    callback: () => void
    disabled?: boolean
}

/**
 * Right-click context menu overlay for graph nodes.
 */
export class GraphContextMenu extends Component {
    private menuEl: HTMLElement
    private dismissHandler: ((e: MouseEvent) => void) | null = null

    constructor(containerEl: HTMLElement) {
        super()
        this.menuEl = containerEl.createDiv({ cls: 'ge-context-menu ge-context-menu--hidden' })
    }

    override onunload(): void {
        this.removeDismissHandler()
        this.menuEl.remove()
    }

    show(_node: GraphNode, x: number, y: number, actions: ContextMenuAction[]): void {
        this.menuEl.empty()
        this.menuEl.removeClass('ge-context-menu--hidden')

        // Position with boundary check
        this.menuEl.style.left = `${x}px`
        this.menuEl.style.top = `${y}px`

        // Actions
        for (const action of actions) {
            const item = this.menuEl.createDiv({
                cls: `ge-context-menu__item${action.disabled ? ' ge-context-menu__item--disabled' : ''}`
            })
            if (action.icon) {
                item.createSpan({ cls: 'ge-context-menu__icon', text: action.icon })
            }
            item.createSpan({ cls: 'ge-context-menu__label', text: action.label })
            if (!action.disabled) {
                item.addEventListener('click', (e) => {
                    e.stopPropagation()
                    action.callback()
                    this.hide()
                })
            }
        }

        // Adjust position if overflowing
        window.requestAnimationFrame(() => {
            const parent = this.menuEl.parentElement
            if (!parent) return
            const parentRect = parent.getBoundingClientRect()
            const menuRect = this.menuEl.getBoundingClientRect()
            if (menuRect.right > parentRect.right) {
                this.menuEl.style.left = `${x - menuRect.width}px`
            }
            if (menuRect.bottom > parentRect.bottom) {
                this.menuEl.style.top = `${y - menuRect.height}px`
            }
        })

        // Dismiss on click outside (deferred to avoid immediate dismiss)
        this.removeDismissHandler()
        this.dismissHandler = (e: MouseEvent) => {
            if (!this.menuEl.contains(e.target as Node)) {
                this.hide()
            }
        }
        window.setTimeout(() => {
            if (this.dismissHandler) {
                activeDocument.addEventListener('click', this.dismissHandler)
            }
        }, 0)
    }

    hide(): void {
        this.menuEl.addClass('ge-context-menu--hidden')
        this.removeDismissHandler()
    }

    isVisible(): boolean {
        return !this.menuEl.hasClass('ge-context-menu--hidden')
    }

    private removeDismissHandler(): void {
        if (this.dismissHandler) {
            activeDocument.removeEventListener('click', this.dismissHandler)
            this.dismissHandler = null
        }
    }
}
