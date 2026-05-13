import { Component } from 'obsidian'

/** Viewport state snapshot from the main graph canvas */
export interface MinimapViewport {
    nodes: ReadonlyArray<{ x: number; y: number; color: string }>
    zoom: number
    centerX: number
    centerY: number
    width: number
    height: number
}

export interface MinimapCallbacks {
    onPan: (worldX: number, worldY: number) => void
    getViewport: () => MinimapViewport | null
}

const MINIMAP_WIDTH = 236 // 240px wrapper - 2px border - 2px for rounding
const MINIMAP_HEIGHT = 140
const PADDING = 10
const NODE_RADIUS = 2.5
const VIEWPORT_STROKE = 'rgba(139, 92, 246, 0.8)' // purple
const BG_COLOR_LIGHT = 'rgba(245, 245, 245, 0.95)'
const BG_COLOR_DARK = 'rgba(30, 30, 35, 0.95)'

/**
 * A bird's-eye minimap overlay that shows all graph nodes and the current
 * viewport rectangle. Clicking/dragging on the minimap pans the main graph.
 */
export class GraphMinimap extends Component {
    private containerEl: HTMLElement
    private canvas: HTMLCanvasElement
    private ctx: CanvasRenderingContext2D
    private callbacks: MinimapCallbacks
    private animFrameId: number | null = null
    private collapsed = false
    private dragging = false

    constructor(parentEl: HTMLElement, callbacks: MinimapCallbacks) {
        super()
        this.callbacks = callbacks

        // Wrapper
        this.containerEl = parentEl.createDiv({ cls: 'ge-minimap' })

        // Header with collapse toggle
        const header = this.containerEl.createDiv({ cls: 'ge-minimap__header' })
        header.createSpan({ text: 'Minimap', cls: 'ge-minimap__title' })
        const collapseBtn = header.createEl('button', {
            cls: 'ge-minimap__collapse-btn clickable-icon',
            attr: { 'aria-label': 'Toggle minimap', 'title': 'Toggle minimap' }
        })
        collapseBtn.textContent = '\u25BC'
        this.registerDomEvent(header, 'click', () => {
            this.collapsed = !this.collapsed
            this.canvas.toggleClass('ge-minimap__canvas--hidden', this.collapsed)
            collapseBtn.textContent = this.collapsed ? '\u25B2' : '\u25BC'
        })

        // Canvas
        this.canvas = this.containerEl.createEl('canvas', { cls: 'ge-minimap__canvas' })
        this.canvas.width = MINIMAP_WIDTH * 2 // 2x for retina
        this.canvas.height = MINIMAP_HEIGHT * 2
        this.canvas.style.width = `${MINIMAP_WIDTH}px`
        this.canvas.style.height = `${MINIMAP_HEIGHT}px`

        const rawCtx = this.canvas.getContext('2d')
        if (!rawCtx) throw new Error('Could not get 2d context for minimap canvas')
        this.ctx = rawCtx
    }

    override onload(): void {
        // Mouse events for panning
        this.registerDomEvent(this.canvas, 'mousedown', (e: MouseEvent) => {
            e.preventDefault()
            e.stopPropagation()
            this.dragging = true
            this.handleMinimapClick(e)
        })
        this.registerDomEvent(this.canvas, 'mousemove', (e: MouseEvent) => {
            if (this.dragging) {
                e.preventDefault()
                this.handleMinimapClick(e)
            }
        })
        this.registerDomEvent(activeDocument, 'mouseup', () => {
            this.dragging = false
        })

        this.startRenderLoop()
    }

    override onunload(): void {
        if (this.animFrameId != null) {
            window.cancelAnimationFrame(this.animFrameId)
            this.animFrameId = null
        }
        this.containerEl.remove()
    }

    private startRenderLoop(): void {
        let lastRender = 0
        const loop = (time: number): void => {
            // Throttle to ~15fps to keep it cheap
            if (time - lastRender > 66) {
                lastRender = time
                this.render()
            }
            this.animFrameId = window.requestAnimationFrame(loop)
        }
        this.animFrameId = window.requestAnimationFrame(loop)
    }

    private render(): void {
        if (this.collapsed) return
        const viewport = this.callbacks.getViewport()
        if (!viewport || viewport.nodes.length === 0) {
            this.renderEmpty()
            return
        }

        const isDark = activeDocument.body.classList.contains('theme-dark')
        const ctx = this.ctx
        const cw = MINIMAP_WIDTH * 2
        const ch = MINIMAP_HEIGHT * 2

        // Clear
        ctx.clearRect(0, 0, cw, ch)
        ctx.fillStyle = isDark ? BG_COLOR_DARK : BG_COLOR_LIGHT
        ctx.fillRect(0, 0, cw, ch)

        // Compute bounding box of all nodes
        let minX = Infinity
        let maxX = -Infinity
        let minY = Infinity
        let maxY = -Infinity
        for (const n of viewport.nodes) {
            if (n.x < minX) minX = n.x
            if (n.x > maxX) maxX = n.x
            if (n.y < minY) minY = n.y
            if (n.y > maxY) maxY = n.y
        }

        // Add padding in world space
        const rangeX = maxX - minX || 1
        const rangeY = maxY - minY || 1
        const padX = rangeX * 0.1
        const padY = rangeY * 0.1
        minX -= padX
        maxX += padX
        minY -= padY
        maxY += padY

        const worldW = maxX - minX
        const worldH = maxY - minY

        // Scale to fit minimap canvas (with pixel padding)
        const drawW = cw - PADDING * 2 * 2
        const drawH = ch - PADDING * 2 * 2
        const scale = Math.min(drawW / worldW, drawH / worldH)
        const offsetX = (cw - worldW * scale) / 2
        const offsetY = (ch - worldH * scale) / 2

        // Store transform for click handling
        this.lastTransform = { minX, minY, worldW, worldH, scale, offsetX, offsetY }

        // Draw nodes
        for (const n of viewport.nodes) {
            const sx = (n.x - minX) * scale + offsetX
            const sy = (n.y - minY) * scale + offsetY
            ctx.beginPath()
            ctx.arc(sx, sy, NODE_RADIUS * 2, 0, Math.PI * 2)
            ctx.fillStyle = n.color
            ctx.fill()
        }

        // Draw viewport rectangle
        const vw = viewport.width / viewport.zoom
        const vh = viewport.height / viewport.zoom
        const vx = viewport.centerX - vw / 2
        const vy = viewport.centerY - vh / 2

        const rx = (vx - minX) * scale + offsetX
        const ry = (vy - minY) * scale + offsetY
        const rw = vw * scale
        const rh = vh * scale

        ctx.strokeStyle = VIEWPORT_STROKE
        ctx.lineWidth = 2
        ctx.strokeRect(rx, ry, rw, rh)

        // Subtle fill for viewport area
        ctx.fillStyle = isDark ? 'rgba(139, 92, 246, 0.08)' : 'rgba(139, 92, 246, 0.06)'
        ctx.fillRect(rx, ry, rw, rh)
    }

    private renderEmpty(): void {
        const ctx = this.ctx
        const cw = MINIMAP_WIDTH * 2
        const ch = MINIMAP_HEIGHT * 2
        const isDark = activeDocument.body.classList.contains('theme-dark')
        ctx.clearRect(0, 0, cw, ch)
        ctx.fillStyle = isDark ? BG_COLOR_DARK : BG_COLOR_LIGHT
        ctx.fillRect(0, 0, cw, ch)
    }

    // Store the last render transform for click → world coordinate mapping
    private lastTransform: {
        minX: number
        minY: number
        worldW: number
        worldH: number
        scale: number
        offsetX: number
        offsetY: number
    } | null = null

    private handleMinimapClick(e: MouseEvent): void {
        if (!this.lastTransform) return
        const rect = this.canvas.getBoundingClientRect()
        // Convert from CSS pixels to canvas pixels (2x retina)
        const canvasX = ((e.clientX - rect.left) / rect.width) * (MINIMAP_WIDTH * 2)
        const canvasY = ((e.clientY - rect.top) / rect.height) * (MINIMAP_HEIGHT * 2)

        const { minX, minY, scale, offsetX, offsetY } = this.lastTransform
        const worldX = (canvasX - offsetX) / scale + minX
        const worldY = (canvasY - offsetY) / scale + minY

        this.callbacks.onPan(worldX, worldY)
    }
}
