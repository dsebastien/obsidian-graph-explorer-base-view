# Graph Explorer Base View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an Obsidian plugin that adds a custom Base view type rendering notes as a force-directed graph with explored/unexplored visual states, link-based connections, and an embedded note side panel.

**Architecture:** A `BasesView` subclass orchestrates a `force-graph` Canvas renderer, a side panel with `MarkdownRenderer` for note reading, and overlay controls for search/filtering. Graph data is built from Base entries + `metadataCache.resolvedLinks`. Explored state is read/written via frontmatter property (default: `explored`). Missing property = unexplored (false).

**Tech Stack:** TypeScript (strict), Obsidian Bases API (`registerBasesView`, `BasesView`, `BasesEntry`), `force-graph` (Canvas 2D force-directed graph), Tailwind CSS v4, Bun (build/test), Immer (immutable settings).

---

## File Structure

```
src/
  main.ts                              # Re-export plugin (exists, modify export name)
  app/
    plugin.ts                          # Modify: rename class, add registerBasesView
    settings/
      settings-tab.ts                  # Modify: rename class
    types/
      plugin-settings.intf.ts          # Modify: update settings interface
      graph-types.ts                   # NEW: GraphNode, GraphLink, GraphData
    views/
      graph-explorer/
        graph-explorer-view.ts         # NEW: BasesView subclass
        graph-explorer-options.ts      # NEW: ViewOption[] factory
        graph-explorer.constants.ts    # NEW: View type ID, defaults
    components/
      graph-canvas.ts                  # NEW: force-graph wrapper + custom node painting
      graph-side-panel.ts              # NEW: Note detail panel with MarkdownRenderer
      graph-controls.ts               # NEW: Search + filter overlay
      graph-zoom-controls.ts           # NEW: Zoom buttons
    services/
      graph-data-builder.ts            # NEW: Base entries -> graph nodes/links
      graph-data-builder.spec.ts       # NEW: Tests
    utils/
      frontmatter-utils.ts            # NEW: Read/write explored property
      frontmatter-utils.spec.ts       # NEW: Tests
  utils/
    log.ts                             # Exists, no changes
  styles.src.css                       # Modify: add graph styles
```

---

### Task 1: Project Setup

**Files:**

- Modify: `manifest.json`
- Modify: `package.json` (force-graph already installed, verify)

- [ ] **Step 1: Update manifest.json**

Update the plugin ID, name, description, and minAppVersion (Bases API requires 1.10.0):

```json
{
    "id": "graph-explorer-base-view",
    "name": "Graph Explorer Base View",
    "description": "A custom Obsidian Bases view that renders notes as an interactive force-directed graph with explored/unexplored tracking",
    "version": "0.1.0",
    "minAppVersion": "1.10.0",
    "isDesktopOnly": false,
    "author": "Sébastien Dubois",
    "authorUrl": "https://dsebastien.net",
    "fundingUrl": "https://www.buymeacoffee.com/dsebastien"
}
```

- [ ] **Step 2: Update versions.json**

```json
{
    "0.1.0": "1.10.0"
}
```

- [ ] **Step 3: Update package.json name**

Change `"name"` from `"obsidian-my-plugin"` to `"graph-explorer-base-view"` (must match manifest ID for dev vault copy).

- [ ] **Step 4: Verify force-graph is in dependencies**

Run: `grep force-graph package.json`
Expected: `"force-graph": "^1.51.2"` or similar in dependencies.

If not present, run: `bun add force-graph`

- [ ] **Step 5: Commit**

```bash
git add manifest.json versions.json package.json
git commit -m "chore: update plugin metadata for graph explorer base view"
```

---

### Task 2: Type Definitions

**Files:**

- Modify: `src/app/types/plugin-settings.intf.ts`
- Create: `src/app/types/graph-types.ts`

- [ ] **Step 1: Update plugin settings interface**

Replace `src/app/types/plugin-settings.intf.ts`:

```typescript
export interface PluginSettings {
    /**
     * Default frontmatter property name used to track explored status.
     * This is the global default; can be overridden per-view via view options.
     */
    exploredPropertyName: string
}

export const DEFAULT_SETTINGS: PluginSettings = {
    exploredPropertyName: 'explored'
}
```

- [ ] **Step 2: Create graph type definitions**

Create `src/app/types/graph-types.ts`:

```typescript
import type { NodeObject, LinkObject } from 'force-graph'

/**
 * A node in the graph representing a vault note.
 */
export interface GraphNode extends NodeObject {
    /** Vault file path (unique identifier) */
    id: string
    /** Display name (file basename without extension) */
    name: string
    /** Whether the note has been explored */
    explored: boolean
    /** Number of connections to other nodes in the graph */
    connectionCount: number
    /** Whether this node is from outside the Base filter (an "external" linked note) */
    external: boolean
}

/**
 * A link/edge in the graph representing a wiki-link between two notes.
 */
export interface GraphLink extends LinkObject<GraphNode> {
    source: string
    target: string
}

/**
 * The full graph dataset ready for force-graph rendering.
 */
export interface GraphData {
    nodes: GraphNode[]
    links: GraphLink[]
}

/**
 * Filter mode for explored status.
 */
export type ExploredFilter = 'all' | 'explored' | 'unexplored'
```

- [ ] **Step 3: Run type check**

Run: `bunx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/types/plugin-settings.intf.ts src/app/types/graph-types.ts
git commit -m "feat: add graph type definitions and update plugin settings"
```

---

### Task 3: Frontmatter Utilities

**Files:**

- Create: `src/app/utils/frontmatter-utils.ts`
- Create: `src/app/utils/frontmatter-utils.spec.ts`

- [ ] **Step 1: Write failing tests**

Create `src/app/utils/frontmatter-utils.spec.ts`:

```typescript
import { describe, test, expect, mock } from 'bun:test'
import { isNoteExplored, setNoteExplored } from './frontmatter-utils'

describe('isNoteExplored', () => {
    test('returns false when property is missing from metadata', () => {
        const metadata = { frontmatter: {} }
        expect(isNoteExplored(metadata, 'explored')).toBe(false)
    })

    test('returns false when frontmatter is undefined', () => {
        const metadata = {}
        expect(isNoteExplored(metadata, 'explored')).toBe(false)
    })

    test('returns false when property is false', () => {
        const metadata = { frontmatter: { explored: false } }
        expect(isNoteExplored(metadata, 'explored')).toBe(false)
    })

    test('returns true when property is true', () => {
        const metadata = { frontmatter: { explored: true } }
        expect(isNoteExplored(metadata, 'explored')).toBe(true)
    })

    test('returns false for non-boolean truthy values', () => {
        const metadata = { frontmatter: { explored: 'yes' } }
        expect(isNoteExplored(metadata, 'explored')).toBe(false)
    })

    test('uses custom property name', () => {
        const metadata = { frontmatter: { reviewed: true } }
        expect(isNoteExplored(metadata, 'reviewed')).toBe(true)
    })
})

describe('setNoteExplored', () => {
    test('calls processFrontMatter with correct arguments', async () => {
        const processFrontMatter = mock(
            async (_file: unknown, cb: (fm: Record<string, unknown>) => void) => {
                const fm: Record<string, unknown> = {}
                cb(fm)
                expect(fm['explored']).toBe(true)
            }
        )
        const app = {
            fileManager: { processFrontMatter }
        } as unknown as import('obsidian').App
        const file = { path: 'test.md' } as unknown as import('obsidian').TFile

        await setNoteExplored(app, file, 'explored', true)
        expect(processFrontMatter).toHaveBeenCalledTimes(1)
    })

    test('sets property to false', async () => {
        const processFrontMatter = mock(
            async (_file: unknown, cb: (fm: Record<string, unknown>) => void) => {
                const fm: Record<string, unknown> = { explored: true }
                cb(fm)
                expect(fm['explored']).toBe(false)
            }
        )
        const app = {
            fileManager: { processFrontMatter }
        } as unknown as import('obsidian').App
        const file = { path: 'test.md' } as unknown as import('obsidian').TFile

        await setNoteExplored(app, file, 'explored', false)
        expect(processFrontMatter).toHaveBeenCalledTimes(1)
    })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test src/app/utils/frontmatter-utils.spec.ts`
Expected: FAIL - module not found.

- [ ] **Step 3: Implement frontmatter utilities**

Create `src/app/utils/frontmatter-utils.ts`:

```typescript
import type { App, TFile, CachedMetadata } from 'obsidian'

/**
 * Check if a note is marked as explored based on its cached metadata.
 * Returns false if the property is missing or not a boolean true.
 */
export function isNoteExplored(
    metadata: Partial<CachedMetadata> | null,
    propertyName: string
): boolean {
    if (!metadata?.frontmatter) return false
    const value: unknown = metadata.frontmatter[propertyName]
    return value === true
}

/**
 * Set the explored status of a note by updating its frontmatter property.
 */
export async function setNoteExplored(
    app: App,
    file: TFile,
    propertyName: string,
    explored: boolean
): Promise<void> {
    await app.fileManager.processFrontMatter(file, (frontmatter: Record<string, unknown>) => {
        frontmatter[propertyName] = explored
    })
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test src/app/utils/frontmatter-utils.spec.ts`
Expected: All 7 tests pass.

- [ ] **Step 5: Run linter and formatter**

Run: `bun run format && bun run lint`
Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/utils/frontmatter-utils.ts src/app/utils/frontmatter-utils.spec.ts
git commit -m "feat: add frontmatter utilities for explored property"
```

---

### Task 4: Graph Data Builder

**Files:**

- Create: `src/app/services/graph-data-builder.ts`
- Create: `src/app/services/graph-data-builder.spec.ts`

- [ ] **Step 1: Write failing tests**

Create `src/app/services/graph-data-builder.spec.ts`:

```typescript
import { describe, test, expect } from 'bun:test'
import { buildGraphData } from './graph-data-builder'
import type { BasesEntry } from 'obsidian'

function makeEntry(path: string, basename: string): BasesEntry {
    return {
        file: { path, basename } as import('obsidian').TFile,
        getValue: () => null
    } as unknown as BasesEntry
}

function makeResolvedLinks(
    links: Record<string, Record<string, number>>
): Record<string, Record<string, number>> {
    return links
}

function makeMetadataCache(
    resolvedLinks: Record<string, Record<string, number>>,
    frontmatterMap: Record<string, Record<string, unknown> | undefined> = {}
) {
    return {
        resolvedLinks,
        getFileCache: (file: { path: string }) => {
            const fm = frontmatterMap[file.path]
            if (fm) return { frontmatter: fm }
            return null
        }
    }
}

describe('buildGraphData', () => {
    test('creates nodes from entries', () => {
        const entries = [makeEntry('note-a.md', 'note-a'), makeEntry('note-b.md', 'note-b')]
        const cache = makeMetadataCache({})
        const result = buildGraphData(entries, cache as never, 'explored', false, 'all')

        expect(result.nodes).toHaveLength(2)
        expect(result.nodes[0]?.id).toBe('note-a.md')
        expect(result.nodes[0]?.name).toBe('note-a')
        expect(result.nodes[0]?.explored).toBe(false)
        expect(result.nodes[0]?.external).toBe(false)
    })

    test('marks explored notes based on frontmatter', () => {
        const entries = [makeEntry('note-a.md', 'note-a')]
        const cache = makeMetadataCache({}, { 'note-a.md': { explored: true } })
        const result = buildGraphData(entries, cache as never, 'explored', false, 'all')

        expect(result.nodes[0]?.explored).toBe(true)
    })

    test('missing explored property means unexplored', () => {
        const entries = [makeEntry('note-a.md', 'note-a')]
        const cache = makeMetadataCache({}, { 'note-a.md': { title: 'A' } })
        const result = buildGraphData(entries, cache as never, 'explored', false, 'all')

        expect(result.nodes[0]?.explored).toBe(false)
    })

    test('creates links from resolvedLinks between entries', () => {
        const entries = [makeEntry('a.md', 'a'), makeEntry('b.md', 'b')]
        const links = makeResolvedLinks({ 'a.md': { 'b.md': 1 } })
        const cache = makeMetadataCache(links)
        const result = buildGraphData(entries, cache as never, 'explored', false, 'all')

        expect(result.links).toHaveLength(1)
        expect(result.links[0]?.source).toBe('a.md')
        expect(result.links[0]?.target).toBe('b.md')
    })

    test('deduplicates bidirectional links', () => {
        const entries = [makeEntry('a.md', 'a'), makeEntry('b.md', 'b')]
        const links = makeResolvedLinks({ 'a.md': { 'b.md': 1 }, 'b.md': { 'a.md': 1 } })
        const cache = makeMetadataCache(links)
        const result = buildGraphData(entries, cache as never, 'explored', false, 'all')

        expect(result.links).toHaveLength(1)
    })

    test('does not include external nodes when showExternal is false', () => {
        const entries = [makeEntry('a.md', 'a')]
        const links = makeResolvedLinks({ 'a.md': { 'external.md': 1 } })
        const cache = makeMetadataCache(links)
        const result = buildGraphData(entries, cache as never, 'explored', false, 'all')

        expect(result.nodes).toHaveLength(1)
        expect(result.links).toHaveLength(0)
    })

    test('includes external nodes when showExternal is true', () => {
        const entries = [makeEntry('a.md', 'a')]
        const links = makeResolvedLinks({ 'a.md': { 'external.md': 1 } })
        const cache = makeMetadataCache(links)
        const result = buildGraphData(entries, cache as never, 'explored', true, 'all')

        expect(result.nodes).toHaveLength(2)
        const externalNode = result.nodes.find((n) => n.id === 'external.md')
        expect(externalNode?.external).toBe(true)
        expect(externalNode?.name).toBe('external')
        expect(result.links).toHaveLength(1)
    })

    test('filters to explored only', () => {
        const entries = [makeEntry('a.md', 'a'), makeEntry('b.md', 'b')]
        const cache = makeMetadataCache({}, { 'a.md': { explored: true } })
        const result = buildGraphData(entries, cache as never, 'explored', false, 'explored')

        expect(result.nodes).toHaveLength(1)
        expect(result.nodes[0]?.id).toBe('a.md')
    })

    test('filters to unexplored only', () => {
        const entries = [makeEntry('a.md', 'a'), makeEntry('b.md', 'b')]
        const cache = makeMetadataCache({}, { 'a.md': { explored: true } })
        const result = buildGraphData(entries, cache as never, 'explored', false, 'unexplored')

        expect(result.nodes).toHaveLength(1)
        expect(result.nodes[0]?.id).toBe('b.md')
    })

    test('calculates connectionCount correctly', () => {
        const entries = [makeEntry('a.md', 'a'), makeEntry('b.md', 'b'), makeEntry('c.md', 'c')]
        const links = makeResolvedLinks({ 'a.md': { 'b.md': 1, 'c.md': 1 } })
        const cache = makeMetadataCache(links)
        const result = buildGraphData(entries, cache as never, 'explored', false, 'all')

        const nodeA = result.nodes.find((n) => n.id === 'a.md')
        expect(nodeA?.connectionCount).toBe(2)
    })

    test('returns empty graph for empty entries', () => {
        const cache = makeMetadataCache({})
        const result = buildGraphData([], cache as never, 'explored', false, 'all')

        expect(result.nodes).toHaveLength(0)
        expect(result.links).toHaveLength(0)
    })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test src/app/services/graph-data-builder.spec.ts`
Expected: FAIL - module not found.

- [ ] **Step 3: Implement graph data builder**

Create `src/app/services/graph-data-builder.ts`:

```typescript
import type { BasesEntry, MetadataCache } from 'obsidian'
import type { GraphData, GraphNode, GraphLink, ExploredFilter } from '../types/graph-types'
import { isNoteExplored } from '../utils/frontmatter-utils'

/**
 * Build graph data from Base entries and the vault's resolved links.
 *
 * @param entries - The BasesEntry[] from the current Base query result
 * @param metadataCache - Obsidian's MetadataCache for reading resolved links and frontmatter
 * @param exploredProperty - The frontmatter property name to check for explored status
 * @param showExternal - Whether to include nodes that are linked but not in the Base filter
 * @param exploredFilter - Filter mode: 'all', 'explored', or 'unexplored'
 */
export function buildGraphData(
    entries: BasesEntry[],
    metadataCache: MetadataCache,
    exploredProperty: string,
    showExternal: boolean,
    exploredFilter: ExploredFilter
): GraphData {
    // Build a set of entry file paths for quick lookup
    const entryPaths = new Set<string>(entries.map((e) => e.file.path))

    // Build nodes from entries with explored status
    let nodes: GraphNode[] = entries.map((entry) => {
        const metadata = metadataCache.getFileCache(entry.file)
        const explored = isNoteExplored(metadata, exploredProperty)
        return {
            id: entry.file.path,
            name: entry.file.basename,
            explored,
            connectionCount: 0,
            external: false
        }
    })

    // Apply explored filter
    if (exploredFilter === 'explored') {
        nodes = nodes.filter((n) => n.explored)
    } else if (exploredFilter === 'unexplored') {
        nodes = nodes.filter((n) => !n.explored)
    }

    const filteredPaths = new Set<string>(nodes.map((n) => n.id))

    // Build links from resolvedLinks
    const links: GraphLink[] = []
    const seenLinks = new Set<string>()
    const externalNodes = new Map<string, GraphNode>()

    for (const sourcePath of filteredPaths) {
        const targets = metadataCache.resolvedLinks[sourcePath]
        if (!targets) continue

        for (const targetPath of Object.keys(targets)) {
            const targetInFiltered = filteredPaths.has(targetPath)
            const targetInEntries = entryPaths.has(targetPath)

            if (targetInFiltered) {
                // Link between two filtered nodes
                const canonicalKey = [sourcePath, targetPath].sort().join('|')
                if (!seenLinks.has(canonicalKey)) {
                    seenLinks.add(canonicalKey)
                    links.push({ source: sourcePath, target: targetPath })
                }
            } else if (showExternal && !targetInEntries) {
                // External link - target not in base at all
                const canonicalKey = [sourcePath, targetPath].sort().join('|')
                if (!seenLinks.has(canonicalKey)) {
                    seenLinks.add(canonicalKey)
                    links.push({ source: sourcePath, target: targetPath })
                }
                if (!externalNodes.has(targetPath)) {
                    const basename = targetPath.replace(/\.md$/, '').split('/').pop() ?? targetPath
                    externalNodes.set(targetPath, {
                        id: targetPath,
                        name: basename,
                        explored: false,
                        connectionCount: 0,
                        external: true
                    })
                }
            } else if (showExternal && targetInEntries && !targetInFiltered) {
                // Target is in entries but was filtered out by explored filter
                // Still show it as a connection if showExternal
                const canonicalKey = [sourcePath, targetPath].sort().join('|')
                if (!seenLinks.has(canonicalKey)) {
                    seenLinks.add(canonicalKey)
                    links.push({ source: sourcePath, target: targetPath })
                }
                if (!externalNodes.has(targetPath)) {
                    const entry = entries.find((e) => e.file.path === targetPath)
                    if (entry) {
                        const metadata = metadataCache.getFileCache(entry.file)
                        externalNodes.set(targetPath, {
                            id: targetPath,
                            name: entry.file.basename,
                            explored: isNoteExplored(metadata, exploredProperty),
                            connectionCount: 0,
                            external: true
                        })
                    }
                }
            }
        }
    }

    // Add external nodes
    const allNodes = [...nodes, ...externalNodes.values()]

    // Calculate connection counts
    const connectionCounts = new Map<string, number>()
    for (const link of links) {
        connectionCounts.set(link.source, (connectionCounts.get(link.source) ?? 0) + 1)
        connectionCounts.set(link.target, (connectionCounts.get(link.target) ?? 0) + 1)
    }
    for (const node of allNodes) {
        node.connectionCount = connectionCounts.get(node.id) ?? 0
    }

    return { nodes: allNodes, links }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test src/app/services/graph-data-builder.spec.ts`
Expected: All 10 tests pass.

- [ ] **Step 5: Run linter and formatter**

Run: `bun run format && bun run lint`

- [ ] **Step 6: Commit**

```bash
git add src/app/services/graph-data-builder.ts src/app/services/graph-data-builder.spec.ts
git commit -m "feat: add graph data builder to transform base entries into graph nodes/links"
```

---

### Task 5: Constants and View Options

**Files:**

- Create: `src/app/views/graph-explorer/graph-explorer.constants.ts`
- Create: `src/app/views/graph-explorer/graph-explorer-options.ts`

- [ ] **Step 1: Create constants**

Create `src/app/views/graph-explorer/graph-explorer.constants.ts`:

```typescript
export const GRAPH_EXPLORER_VIEW_TYPE = 'graph-explorer'
```

- [ ] **Step 2: Create view options factory**

Create `src/app/views/graph-explorer/graph-explorer-options.ts`:

```typescript
import type { DropdownOption, TextOption, ToggleOption, ViewOption } from 'obsidian'

export function getGraphExplorerViewOptions(): ViewOption[] {
    return [
        {
            type: 'text',
            key: 'exploredProperty',
            displayName: 'Explored property name',
            default: 'explored'
        } as TextOption,
        {
            type: 'toggle',
            key: 'showExternalNodes',
            displayName: 'Show linked notes outside the base',
            default: false
        } as ToggleOption,
        {
            type: 'dropdown',
            key: 'exploredFilter',
            displayName: 'Filter by explored status',
            default: 'all',
            options: {
                all: 'All',
                explored: 'Explored only',
                unexplored: 'Unexplored only'
            }
        } as DropdownOption
    ]
}
```

- [ ] **Step 3: Run type check**

Run: `bunx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/views/graph-explorer/graph-explorer.constants.ts src/app/views/graph-explorer/graph-explorer-options.ts
git commit -m "feat: add graph explorer view constants and options"
```

---

### Task 6: Graph Canvas Component

**Files:**

- Create: `src/app/components/graph-canvas.ts`

This component wraps `force-graph` and handles custom node rendering, interactions, and lifecycle.

- [ ] **Step 1: Create graph canvas**

Create `src/app/components/graph-canvas.ts`:

```typescript
import { Component } from 'obsidian'
import ForceGraph from 'force-graph'
import type { GraphData, GraphNode, GraphLink } from '../types/graph-types'

export interface GraphCanvasCallbacks {
    onNodeClick: (node: GraphNode) => void
    onNodeDoubleClick: (node: GraphNode) => void
    onBackgroundClick: () => void
}

/**
 * Wraps force-graph Canvas renderer with custom node painting and interactions.
 */
export class GraphCanvas extends Component {
    private graph: ReturnType<typeof ForceGraph<GraphNode, GraphLink>> | null = null
    private containerEl: HTMLElement
    private canvasContainerEl: HTMLElement
    private resizeObserver: ResizeObserver | null = null
    private hoveredNode: GraphNode | null = null
    private selectedNodeId: string | null = null
    private adjacencyMap: Map<string, Set<string>> = new Map()
    private callbacks: GraphCanvasCallbacks
    private isDark = false
    private lastClickTime = 0
    private lastClickNodeId: string | null = null

    constructor(containerEl: HTMLElement, callbacks: GraphCanvasCallbacks) {
        super()
        this.containerEl = containerEl
        this.callbacks = callbacks

        this.canvasContainerEl = containerEl.createDiv({ cls: 'ge-canvas-container' })

        this.isDark = document.body.classList.contains('theme-dark')
    }

    override onload(): void {
        this.initGraph()
        this.setupResizeObserver()
    }

    override onunload(): void {
        this.resizeObserver?.disconnect()
        this.resizeObserver = null
        if (this.graph) {
            this.graph._destructor()
            this.graph = null
        }
        this.canvasContainerEl.empty()
    }

    private initGraph(): void {
        const width = this.canvasContainerEl.clientWidth || 600
        const height = this.canvasContainerEl.clientHeight || 400

        this.graph = ForceGraph<GraphNode, GraphLink>()(this.canvasContainerEl)
            .width(width)
            .height(height)
            .backgroundColor('transparent')
            .nodeId('id')
            .linkSource('source')
            .linkTarget('target')
            .cooldownTicks(100)
            .warmupTicks(50)
            .minZoom(0.1)
            .maxZoom(20)
            .enableNodeDrag(true)
            .nodeCanvasObjectMode(() => 'replace')
            .nodeCanvasObject((node, ctx, globalScale) => this.paintNode(node, ctx, globalScale))
            .nodePointerAreaPaint((node, color, ctx) => this.paintNodePointerArea(node, color, ctx))
            .linkColor(() => this.getLinkColor(false))
            .linkWidth((link) => this.getLinkWidth(link))
            .onNodeClick((node) => this.handleNodeClick(node))
            .onNodeHover((node) => this.handleNodeHover(node))
            .onBackgroundClick((event) => {
                // Only handle if it wasn't a double-click
                if (event.detail <= 1) {
                    this.callbacks.onBackgroundClick()
                }
            })
    }

    private setupResizeObserver(): void {
        this.resizeObserver = new ResizeObserver((entries) => {
            const entry = entries[0]
            if (entry && this.graph) {
                const { width, height } = entry.contentRect
                if (width > 0 && height > 0) {
                    this.graph.width(width).height(height)
                }
            }
        })
        this.resizeObserver.observe(this.canvasContainerEl)
    }

    setData(data: GraphData): void {
        if (!this.graph) return

        // Build adjacency map for neighbor highlighting
        this.adjacencyMap.clear()
        for (const link of data.links) {
            const sourceId =
                typeof link.source === 'object' ? (link.source.id ?? '') : String(link.source)
            const targetId =
                typeof link.target === 'object' ? (link.target.id ?? '') : String(link.target)
            if (!this.adjacencyMap.has(sourceId)) this.adjacencyMap.set(sourceId, new Set())
            if (!this.adjacencyMap.has(targetId)) this.adjacencyMap.set(targetId, new Set())
            this.adjacencyMap.get(sourceId)!.add(targetId)
            this.adjacencyMap.get(targetId)!.add(sourceId)
        }

        this.graph.graphData(data)

        // Zoom to fit after physics settle
        setTimeout(() => {
            this.graph?.zoomToFit(400, 40)
        }, 500)
    }

    setSelectedNode(nodeId: string | null): void {
        this.selectedNodeId = nodeId
    }

    setSearchHighlight(_matchIds: Set<string>): void {
        // Re-render will pick up the new matches via closure
        // force-graph re-renders on next frame automatically
    }

    zoomIn(): void {
        this.graph?.zoom(this.graph.zoom() * 2, 300)
    }

    zoomOut(): void {
        this.graph?.zoom(this.graph.zoom() * 0.5, 300)
    }

    zoomToFit(): void {
        this.graph?.zoomToFit(400, 40)
    }

    resetView(): void {
        this.graph?.centerAt(0, 0, 300)
        setTimeout(() => this.graph?.zoomToFit(400, 40), 350)
    }

    private handleNodeClick(node: GraphNode): void {
        const now = Date.now()
        if (this.lastClickNodeId === node.id && now - this.lastClickTime < 400) {
            // Double click
            this.callbacks.onNodeDoubleClick(node)
            this.lastClickTime = 0
            this.lastClickNodeId = null
        } else {
            this.lastClickTime = now
            this.lastClickNodeId = node.id
            this.callbacks.onNodeClick(node)
        }
    }

    private handleNodeHover(node: GraphNode | null): void {
        this.hoveredNode = node
        if (this.graph) {
            this.canvasContainerEl.style.cursor = node ? 'pointer' : 'default'
        }
    }

    private getNodeSize(node: GraphNode): number {
        if (node.external) {
            return Math.max(2, Math.min(8, 2 + node.connectionCount * 0.3))
        }
        return Math.max(3, Math.min(12, 3 + node.connectionCount * 0.4))
    }

    private getNodeColor(node: GraphNode): string {
        if (node.external) {
            return this.isDark ? 'rgba(150, 150, 170, 0.4)' : 'rgba(100, 100, 120, 0.4)'
        }
        if (node.explored) {
            return this.isDark ? 'rgba(34, 197, 94, 0.9)' : 'rgba(22, 163, 74, 0.9)'
        }
        return this.isDark ? 'rgba(148, 163, 184, 0.7)' : 'rgba(100, 116, 139, 0.7)'
    }

    private paintNode(node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number): void {
        const x = node.x ?? 0
        const y = node.y ?? 0
        const size = this.getNodeSize(node)
        const color = this.getNodeColor(node)
        const isSelected = this.selectedNodeId === node.id
        const isHovered = this.hoveredNode?.id === node.id
        const isNeighborOfHovered =
            this.hoveredNode != null &&
            this.adjacencyMap.get(this.hoveredNode.id)?.has(node.id) === true
        const isDimmed = this.hoveredNode != null && !isHovered && !isNeighborOfHovered

        // Dimming
        const alpha = isDimmed ? 0.15 : 1

        // Glow effect on hover
        if (isHovered) {
            ctx.beginPath()
            ctx.arc(x, y, size + 4, 0, 2 * Math.PI)
            ctx.fillStyle = color.replace(/[\d.]+\)$/, '0.3)')
            ctx.fill()
        }

        // Explored ring
        if (node.explored && !node.external) {
            ctx.beginPath()
            ctx.arc(x, y, size + 2, 0, 2 * Math.PI)
            ctx.strokeStyle = isDimmed ? 'rgba(34, 197, 94, 0.15)' : 'rgba(34, 197, 94, 0.6)'
            ctx.lineWidth = 1.5 / globalScale
            ctx.stroke()
        }

        // Selected ring
        if (isSelected) {
            ctx.beginPath()
            ctx.arc(x, y, size + 3, 0, 2 * Math.PI)
            ctx.strokeStyle = 'rgba(139, 92, 246, 0.8)'
            ctx.lineWidth = 2 / globalScale
            ctx.stroke()
        }

        // Main circle
        ctx.beginPath()
        ctx.arc(x, y, size, 0, 2 * Math.PI)
        ctx.fillStyle = color
        ctx.globalAlpha = alpha
        ctx.fill()
        ctx.globalAlpha = 1

        // External node dashed outline
        if (node.external) {
            ctx.setLineDash([2 / globalScale, 2 / globalScale])
            ctx.strokeStyle = this.isDark ? 'rgba(150, 150, 170, 0.3)' : 'rgba(100, 100, 120, 0.3)'
            ctx.lineWidth = 1 / globalScale
            ctx.stroke()
            ctx.setLineDash([])
        }

        // Label for selected, hovered, or neighbor of hovered
        if (isSelected || isHovered || isNeighborOfHovered) {
            const fontSize = Math.max(10 / globalScale, 2)
            ctx.font = `${fontSize}px sans-serif`
            ctx.textAlign = 'center'
            ctx.textBaseline = 'top'
            ctx.fillStyle = this.isDark ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)'
            ctx.globalAlpha = isDimmed ? 0.3 : 1
            ctx.fillText(node.name, x, y + size + 2)
            ctx.globalAlpha = 1
        }
    }

    private paintNodePointerArea(
        node: GraphNode,
        color: string,
        ctx: CanvasRenderingContext2D
    ): void {
        const x = node.x ?? 0
        const y = node.y ?? 0
        const size = this.getNodeSize(node)
        const hitRadius = Math.max(6, size + 2)
        ctx.beginPath()
        ctx.arc(x, y, hitRadius, 0, 2 * Math.PI)
        ctx.fillStyle = color
        ctx.fill()
    }

    private getLinkColor(_external: boolean): string {
        return this.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)'
    }

    private getLinkWidth(link: GraphLink): number {
        const sourceNode = typeof link.source === 'object' ? link.source : null
        const targetNode = typeof link.target === 'object' ? link.target : null
        if (sourceNode?.external || targetNode?.external) return 0.3
        return 0.5
    }
}
```

- [ ] **Step 2: Run type check**

Run: `bunx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/components/graph-canvas.ts
git commit -m "feat: add graph canvas component with force-graph rendering"
```

---

### Task 7: Graph Side Panel

**Files:**

- Create: `src/app/components/graph-side-panel.ts`

- [ ] **Step 1: Create side panel component**

Create `src/app/components/graph-side-panel.ts`:

```typescript
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
    private containerEl: HTMLElement
    private panelEl: HTMLElement
    private headerEl: HTMLElement
    private contentEl: HTMLElement
    private app: App
    private callbacks: GraphSidePanelCallbacks
    private currentNode: GraphNode | null = null
    private currentFile: TFile | null = null
    private renderComponent: Component | null = null

    constructor(containerEl: HTMLElement, app: App, callbacks: GraphSidePanelCallbacks) {
        super()
        this.containerEl = containerEl
        this.app = app
        this.callbacks = callbacks

        this.panelEl = this.containerEl.createDiv({ cls: 'ge-side-panel ge-side-panel--hidden' })
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

        this.currentFile = file
        this.panelEl.removeClass('ge-side-panel--hidden')

        this.renderHeader(node)
        await this.renderContent(file)
    }

    hide(): void {
        this.panelEl.addClass('ge-side-panel--hidden')
        this.currentNode = null
        this.currentFile = null
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

        // Toggle explored button (only for non-external nodes)
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

        // Close button
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
```

- [ ] **Step 2: Run type check**

Run: `bunx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/components/graph-side-panel.ts
git commit -m "feat: add graph side panel with embedded note rendering"
```

---

### Task 8: Graph Controls

**Files:**

- Create: `src/app/components/graph-controls.ts`
- Create: `src/app/components/graph-zoom-controls.ts`

- [ ] **Step 1: Create graph controls overlay**

Create `src/app/components/graph-controls.ts`:

```typescript
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
    private containerEl: HTMLElement
    private controlsEl: HTMLElement
    private statsEl: HTMLElement
    private searchInput: HTMLInputElement
    private callbacks: GraphControlsCallbacks
    private currentFilter: ExploredFilter = 'all'
    private debouncedSearch: Debouncer<[string]>

    constructor(containerEl: HTMLElement, callbacks: GraphControlsCallbacks) {
        super()
        this.containerEl = containerEl
        this.callbacks = callbacks
        this.debouncedSearch = debounce((query: string) => {
            this.callbacks.onSearchChange(query)
        }, 300)

        this.controlsEl = this.containerEl.createDiv({ cls: 'ge-controls' })

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
        const filterLabel = filterSection.createDiv({
            cls: 'ge-controls__filter-label',
            text: 'Show:'
        })
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
        // Update button active state
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
```

- [ ] **Step 2: Create zoom controls**

Create `src/app/components/graph-zoom-controls.ts`:

```typescript
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
    private containerEl: HTMLElement
    private controlsEl: HTMLElement

    constructor(containerEl: HTMLElement, callbacks: ZoomCallbacks) {
        super()
        this.containerEl = containerEl

        this.controlsEl = this.containerEl.createDiv({ cls: 'ge-zoom-controls' })

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
                attr: { 'aria-label': b.ariaLabel }
            })
            this.registerDomEvent(btn, 'click', b.callback)
        }
    }

    override onunload(): void {
        this.controlsEl.remove()
    }
}
```

- [ ] **Step 3: Run type check**

Run: `bunx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/components/graph-controls.ts src/app/components/graph-zoom-controls.ts
git commit -m "feat: add graph controls and zoom controls components"
```

---

### Task 9: Graph Explorer View (BasesView)

**Files:**

- Create: `src/app/views/graph-explorer/graph-explorer-view.ts`

This is the main orchestrator that ties everything together.

- [ ] **Step 1: Create the BasesView subclass**

Create `src/app/views/graph-explorer/graph-explorer-view.ts`:

```typescript
import { BasesView, debounce, TFile } from 'obsidian'
import type { QueryController, Debouncer } from 'obsidian'
import { GRAPH_EXPLORER_VIEW_TYPE } from './graph-explorer.constants'
import { GraphCanvas } from '../../components/graph-canvas'
import { GraphSidePanel } from '../../components/graph-side-panel'
import { GraphControls } from '../../components/graph-controls'
import { GraphZoomControls } from '../../components/graph-zoom-controls'
import { buildGraphData } from '../../services/graph-data-builder'
import { setNoteExplored } from '../../utils/frontmatter-utils'
import type { GraphNode, GraphData, ExploredFilter } from '../../types/graph-types'
import type { GraphExplorerPlugin } from '../../plugin'
import { log } from '../../../utils/log'

export class GraphExplorerView extends BasesView {
    override type = GRAPH_EXPLORER_VIEW_TYPE

    private plugin: GraphExplorerPlugin
    private scrollEl: HTMLElement
    private viewEl: HTMLElement | null = null
    private graphCanvas: GraphCanvas | null = null
    private sidePanel: GraphSidePanel | null = null
    private controls: GraphControls | null = null
    private zoomControls: GraphZoomControls | null = null
    private currentGraphData: GraphData = { nodes: [], links: [] }
    private searchQuery = ''
    private debouncedUpdate: Debouncer<[]>
    private initialized = false

    constructor(controller: QueryController, scrollEl: HTMLElement, plugin: GraphExplorerPlugin) {
        super(controller)
        this.plugin = plugin
        this.scrollEl = scrollEl
        this.debouncedUpdate = debounce(() => {
            this.rebuildGraph()
        }, 50)
    }

    override onload(): void {
        this.buildUI()
        this.initialized = true
    }

    override onunload(): void {
        this.graphCanvas?.unload()
        this.sidePanel?.unload()
        this.controls?.unload()
        this.zoomControls?.unload()
        this.graphCanvas = null
        this.sidePanel = null
        this.controls = null
        this.zoomControls = null
        this.viewEl?.remove()
        this.viewEl = null
        this.initialized = false
    }

    override onDataUpdated(): void {
        if (!this.initialized) return
        this.debouncedUpdate()
    }

    private buildUI(): void {
        this.viewEl = this.scrollEl.createDiv({ cls: 'ge-view' })

        // Graph canvas area
        const graphArea = this.viewEl.createDiv({ cls: 'ge-graph-area' })

        // Canvas
        this.graphCanvas = new GraphCanvas(graphArea, {
            onNodeClick: (node) => this.handleNodeClick(node),
            onNodeDoubleClick: (node) => this.handleNodeDoubleClick(node),
            onBackgroundClick: () => this.handleBackgroundClick()
        })
        this.addChild(this.graphCanvas)

        // Controls overlay
        this.controls = new GraphControls(graphArea, {
            onSearchChange: (query) => this.handleSearchChange(query),
            onExploredFilterChange: (_filter) => this.rebuildGraph()
        })
        this.addChild(this.controls)

        // Zoom controls
        this.zoomControls = new GraphZoomControls(graphArea, {
            onZoomIn: () => this.graphCanvas?.zoomIn(),
            onZoomOut: () => this.graphCanvas?.zoomOut(),
            onZoomToFit: () => this.graphCanvas?.zoomToFit(),
            onReset: () => this.graphCanvas?.resetView()
        })
        this.addChild(this.zoomControls)

        // Side panel
        this.sidePanel = new GraphSidePanel(this.viewEl, this.app, {
            onToggleExplored: (node) => this.handleToggleExplored(node),
            onClose: () => this.handleBackgroundClick()
        })
        this.addChild(this.sidePanel)

        // Initial render
        this.rebuildGraph()
    }

    private rebuildGraph(): void {
        const entries = this.data.data
        const exploredProperty = (this.config.get('exploredProperty') as string) || 'explored'
        const showExternal = (this.config.get('showExternalNodes') as boolean) || false
        const exploredFilter = (this.controls?.getFilter() as ExploredFilter) || 'all'

        this.currentGraphData = buildGraphData(
            entries,
            this.app.metadataCache,
            exploredProperty,
            showExternal,
            exploredFilter
        )

        this.graphCanvas?.setData(this.currentGraphData)

        // Update stats
        const exploredCount = this.currentGraphData.nodes.filter(
            (n) => n.explored && !n.external
        ).length
        const unexploredCount = this.currentGraphData.nodes.filter(
            (n) => !n.explored && !n.external
        ).length
        this.controls?.updateStats({
            totalNodes: this.currentGraphData.nodes.length,
            totalLinks: this.currentGraphData.links.length,
            exploredCount,
            unexploredCount
        })

        // Apply search highlight if active
        if (this.searchQuery) {
            this.applySearchHighlight(this.searchQuery)
        }
    }

    private handleNodeClick(node: GraphNode): void {
        this.graphCanvas?.setSelectedNode(node.id)
        void this.sidePanel?.showNode(node)
    }

    private handleNodeDoubleClick(node: GraphNode): void {
        // Open in new tab
        const file = this.app.vault.getAbstractFileByPath(node.id)
        if (file instanceof TFile) {
            void this.app.workspace.getLeaf('tab').openFile(file)
        }
    }

    private handleBackgroundClick(): void {
        this.graphCanvas?.setSelectedNode(null)
        this.sidePanel?.hide()
    }

    private async handleToggleExplored(node: GraphNode): Promise<void> {
        const file = this.app.vault.getAbstractFileByPath(node.id)
        if (!(file instanceof TFile)) return

        const exploredProperty = (this.config.get('exploredProperty') as string) || 'explored'
        const newExplored = !node.explored

        await setNoteExplored(this.app, file, exploredProperty, newExplored)

        // Update side panel immediately (optimistic)
        this.sidePanel?.updateExploredState(newExplored)

        log(`Toggled explored: ${node.name} -> ${newExplored}`, 'debug')
        // Graph will rebuild on next metadataCache update via onDataUpdated
    }

    private handleSearchChange(query: string): void {
        this.searchQuery = query
        this.applySearchHighlight(query)
    }

    private applySearchHighlight(query: string): void {
        if (!query.trim()) {
            this.graphCanvas?.setSearchHighlight(new Set())
            return
        }
        const lowerQuery = query.toLowerCase()
        const matchIds = new Set<string>(
            this.currentGraphData.nodes
                .filter((n) => n.name.toLowerCase().includes(lowerQuery))
                .map((n) => n.id)
        )
        this.graphCanvas?.setSearchHighlight(matchIds)
    }
}
```

- [ ] **Step 2: Run type check**

Run: `bunx tsc --noEmit`
Expected: No errors. If there are import path issues, fix them.

- [ ] **Step 3: Commit**

```bash
git add src/app/views/graph-explorer/graph-explorer-view.ts
git commit -m "feat: add graph explorer BasesView implementation"
```

---

### Task 10: Plugin Registration

**Files:**

- Modify: `src/main.ts`
- Modify: `src/app/plugin.ts`
- Modify: `src/app/settings/settings-tab.ts`

- [ ] **Step 1: Update plugin class**

Replace `src/app/plugin.ts`:

```typescript
import { Plugin } from 'obsidian'
import { DEFAULT_SETTINGS } from './types/plugin-settings.intf'
import type { PluginSettings } from './types/plugin-settings.intf'
import { GraphExplorerSettingTab } from './settings/settings-tab'
import { GraphExplorerView } from './views/graph-explorer/graph-explorer-view'
import { getGraphExplorerViewOptions } from './views/graph-explorer/graph-explorer-options'
import { GRAPH_EXPLORER_VIEW_TYPE } from './views/graph-explorer/graph-explorer.constants'
import { log } from '../utils/log'
import { produce } from 'immer'
import type { Draft } from 'immer'

export class GraphExplorerPlugin extends Plugin {
    settings: PluginSettings = produce(DEFAULT_SETTINGS, () => DEFAULT_SETTINGS)

    override async onload(): Promise<void> {
        log('Initializing', 'debug')
        await this.loadSettings()
        this.registerViews()
        this.addSettingTab(new GraphExplorerSettingTab(this.app, this))
    }

    override onunload(): void {
        log('Unloading', 'debug')
    }

    private registerViews(): void {
        const registered = this.registerBasesView(GRAPH_EXPLORER_VIEW_TYPE, {
            name: 'Graph Explorer',
            icon: 'git-fork',
            factory: (controller, containerEl) =>
                new GraphExplorerView(controller, containerEl, this),
            options: getGraphExplorerViewOptions
        })

        if (registered) {
            log('Graph Explorer view registered', 'debug')
        } else {
            log('Failed to register Graph Explorer view', 'warn')
        }
    }

    async loadSettings(): Promise<void> {
        log('Loading settings', 'debug')
        const loadedSettings = (await this.loadData()) as PluginSettings | null

        if (!loadedSettings) {
            log('Using default settings', 'debug')
            return
        }

        this.settings = produce(this.settings, (draft: Draft<PluginSettings>) => {
            if (typeof loadedSettings.exploredPropertyName === 'string') {
                draft.exploredPropertyName = loadedSettings.exploredPropertyName
            }
        })

        log('Settings loaded', 'debug', loadedSettings)
    }

    async saveSettings(): Promise<void> {
        log('Saving settings', 'debug', this.settings)
        await this.saveData(this.settings)
        log('Settings saved', 'debug', this.settings)
    }
}
```

- [ ] **Step 2: Update main.ts export**

Replace `src/main.ts`:

```typescript
export { GraphExplorerPlugin as default } from './app/plugin'
```

- [ ] **Step 3: Update settings tab**

Replace `src/app/settings/settings-tab.ts`:

```typescript
import { App, PluginSettingTab, Setting } from 'obsidian'
import type { GraphExplorerPlugin } from '../plugin'

export class GraphExplorerSettingTab extends PluginSettingTab {
    plugin: GraphExplorerPlugin

    constructor(app: App, plugin: GraphExplorerPlugin) {
        super(app, plugin)
        this.plugin = plugin
    }

    display(): void {
        const { containerEl } = this
        containerEl.empty()

        new Setting(containerEl)
            .setName('Default explored property')
            .setDesc(
                'The frontmatter property name used to track explored status. Can be overridden per view.'
            )
            .addText((text) =>
                text
                    .setPlaceholder('explored')
                    .setValue(this.plugin.settings.exploredPropertyName)
                    .onChange(async (value) => {
                        this.plugin.settings = {
                            ...this.plugin.settings,
                            exploredPropertyName: value || 'explored'
                        }
                        await this.plugin.saveSettings()
                    })
            )

        this.renderFollowButton(containerEl)
        this.renderSupportHeader(containerEl)
    }

    renderFollowButton(containerEl: HTMLElement): void {
        new Setting(containerEl)
            .setName('Follow me on X')
            .setDesc('Sébastien Dubois (@dSebastien)')
            .addButton((button) => {
                button.setCta()
                button.setButtonText('Follow me on X').onClick(() => {
                    window.open('https://x.com/dSebastien')
                })
            })
    }

    renderSupportHeader(containerEl: HTMLElement): void {
        new Setting(containerEl).setName('Support').setHeading()

        const supportDesc = new DocumentFragment()
        supportDesc.createDiv({
            text: 'Buy me a coffee to support the development of this plugin'
        })

        new Setting(containerEl).setDesc(supportDesc)

        this.renderBuyMeACoffeeBadge(containerEl)
        const spacing = containerEl.createDiv()
        spacing.classList.add('support-header-margin')
    }

    renderBuyMeACoffeeBadge(contentEl: HTMLElement | DocumentFragment, width = 175): void {
        const linkEl = contentEl.createEl('a', {
            href: 'https://www.buymeacoffee.com/dsebastien'
        })
        const imgEl = linkEl.createEl('img')
        imgEl.src =
            'https://github.com/dsebastien/obsidian-plugin-template/blob/main/src/assets/buy-me-a-coffee.png?raw=true'
        imgEl.alt = 'Buy me a coffee'
        imgEl.width = width
    }
}
```

- [ ] **Step 4: Run type check**

Run: `bunx tsc --noEmit`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add src/main.ts src/app/plugin.ts src/app/settings/settings-tab.ts
git commit -m "feat: register graph explorer base view and update plugin"
```

---

### Task 11: Styles

**Files:**

- Modify: `src/styles.src.css`

- [ ] **Step 1: Add graph explorer styles**

Replace `src/styles.src.css`:

```css
@import 'tailwindcss';

/* ========================================
   SUPPORT & UI SECTIONS
   ======================================== */

.support-header-margin {
    @apply mb-5;
}

/* ========================================
   GRAPH EXPLORER VIEW
   ======================================== */

.ge-view {
    @apply flex w-full;
    height: 100%;
    overflow: hidden;
    position: relative;
}

.ge-graph-area {
    @apply flex-1 relative;
    min-width: 0;
    height: 100%;
}

.ge-canvas-container {
    @apply w-full h-full;
}

.ge-canvas-container canvas {
    @apply block;
}

/* ========================================
   SIDE PANEL
   ======================================== */

.ge-side-panel {
    @apply flex flex-col;
    width: 380px;
    min-width: 320px;
    max-width: 50%;
    height: 100%;
    overflow: hidden;
    border-left: 1px solid var(--background-modifier-border);
    background-color: var(--background-primary);
    transition:
        width 0.15s ease,
        opacity 0.15s ease;
}

.ge-side-panel--hidden {
    @apply hidden;
}

.ge-side-panel__header {
    @apply flex-shrink-0 px-4 py-3;
    border-bottom: 1px solid var(--background-modifier-border);
    background-color: var(--background-secondary);
}

.ge-side-panel__title-row {
    @apply flex items-center justify-between gap-2;
}

.ge-side-panel__title {
    @apply flex items-center gap-1 min-w-0;
    overflow: hidden;
}

.ge-side-panel__name {
    @apply font-medium truncate;
    color: var(--text-normal);
}

.ge-side-panel__explored-badge {
    @apply text-xs px-1.5 py-0.5 rounded flex-shrink-0;
    color: var(--text-on-accent);
    background-color: rgba(34, 197, 94, 0.8);
}

.ge-side-panel__external-badge {
    @apply text-xs px-1.5 py-0.5 rounded flex-shrink-0 italic;
    color: var(--text-muted);
    background-color: var(--background-modifier-hover);
}

.ge-side-panel__actions {
    @apply flex items-center gap-1 flex-shrink-0;
}

.ge-side-panel__toggle-explored {
    @apply text-xs px-2 py-1 rounded cursor-pointer;
    border: 1px solid var(--background-modifier-border);
    background-color: var(--interactive-normal);
    color: var(--text-muted);
    transition: all 0.15s ease;
}

.ge-side-panel__toggle-explored:hover {
    background-color: var(--interactive-hover);
    color: var(--text-normal);
}

.ge-side-panel__toggle-explored--active {
    background-color: rgba(34, 197, 94, 0.15);
    border-color: rgba(34, 197, 94, 0.4);
    color: rgba(34, 197, 94, 1);
}

.ge-side-panel__close {
    @apply text-base cursor-pointer rounded;
    color: var(--text-muted);
}

.ge-side-panel__close:hover {
    color: var(--text-normal);
}

.ge-side-panel__content {
    @apply flex-1 overflow-y-auto px-4 py-3;
}

/* ========================================
   CONTROLS OVERLAY
   ======================================== */

.ge-controls {
    @apply absolute flex flex-col gap-2 p-3 rounded;
    top: 8px;
    left: 8px;
    z-index: 10;
    min-width: 200px;
    max-width: 260px;
    background-color: var(--background-primary);
    border: 1px solid var(--background-modifier-border);
    opacity: 0.95;
}

.ge-controls__search-input {
    @apply w-full px-2 py-1.5 rounded text-sm;
    border: 1px solid var(--background-modifier-border);
    background-color: var(--background-primary);
    color: var(--text-normal);
}

.ge-controls__search-input::placeholder {
    color: var(--text-muted);
}

.ge-controls__stats {
    @apply flex flex-wrap gap-2 text-xs;
    color: var(--text-muted);
}

.ge-controls__filter {
    @apply flex flex-col gap-1;
}

.ge-controls__filter-label {
    @apply text-xs;
    color: var(--text-muted);
}

.ge-controls__filter-buttons {
    @apply flex gap-1;
}

.ge-controls__filter-btn {
    @apply text-xs px-2 py-1 rounded cursor-pointer;
    border: 1px solid var(--background-modifier-border);
    background-color: var(--interactive-normal);
    color: var(--text-muted);
    transition: all 0.15s ease;
}

.ge-controls__filter-btn:hover {
    background-color: var(--interactive-hover);
}

.ge-controls__filter-btn--active {
    background-color: var(--interactive-accent);
    color: var(--text-on-accent);
    border-color: var(--interactive-accent);
}

/* ========================================
   ZOOM CONTROLS
   ======================================== */

.ge-zoom-controls {
    @apply absolute flex flex-col gap-1;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    z-index: 10;
}

.ge-zoom-controls__btn {
    @apply flex items-center justify-center rounded cursor-pointer;
    width: 32px;
    height: 32px;
    font-size: 16px;
    border: 1px solid var(--background-modifier-border);
    background-color: var(--background-primary);
    color: var(--text-normal);
    opacity: 0.9;
    transition: all 0.15s ease;
}

.ge-zoom-controls__btn:hover {
    background-color: var(--interactive-hover);
    opacity: 1;
}

/* ========================================
   EMPTY STATE
   ======================================== */

.ge-empty-state {
    @apply flex items-center justify-center w-full h-full;
    color: var(--text-muted);
    font-style: italic;
}
```

- [ ] **Step 2: Build CSS to verify it compiles**

Run: `bunx @tailwindcss/cli -i src/styles.src.css -o /dev/null`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/styles.src.css
git commit -m "feat: add graph explorer CSS styles"
```

---

### Task 12: Full Build and Manual Test

**Files:** None new - verification task.

- [ ] **Step 1: Run type checker**

Run: `bunx tsc --noEmit`
Expected: No errors.

- [ ] **Step 2: Run all tests**

Run: `bun test`
Expected: All tests pass.

- [ ] **Step 3: Run linter and formatter**

Run: `bun run format && bun run lint`
Expected: No errors.

- [ ] **Step 4: Run production build**

Run: `bun run build`
Expected: Build succeeds. `dist/main.js`, `dist/styles.css`, `dist/manifest.json` are produced.

- [ ] **Step 5: Verify bundle includes force-graph**

Run: `grep -l "force-graph\|ForceGraph\|d3-force" dist/main.js | wc -l`
Expected: 1 (force-graph is bundled, not external).

- [ ] **Step 6: Commit any fixes**

If any fixes were needed during verification:

```bash
git add -A
git commit -m "fix: resolve build issues from integration"
```

---

### Task 13: Documentation Updates

**Files:**

- Modify: `documentation/Architecture.md`
- Modify: `documentation/Domain Model.md`
- Modify: `documentation/Configuration.md`
- Create: `documentation/history/2026-04-07.md`

- [ ] **Step 1: Update Architecture.md**

Write `documentation/Architecture.md`:

```markdown
# Architecture

## Overview

Graph Explorer Base View is an Obsidian plugin that registers a custom Base view type (`graph-explorer`). The view renders notes from an Obsidian Base as a force-directed graph, with visual distinction between explored and unexplored notes.

## Components

### Plugin (`src/app/plugin.ts`)

- Registers the `graph-explorer` Base view type via `registerBasesView()`
- Manages global settings (default explored property name)

### GraphExplorerView (`src/app/views/graph-explorer/graph-explorer-view.ts`)

- `BasesView` subclass, main orchestrator
- Receives data updates from Obsidian Bases via `onDataUpdated()`
- Coordinates graph canvas, side panel, and controls

### GraphCanvas (`src/app/components/graph-canvas.ts`)

- Wraps `force-graph` library for Canvas-based rendering
- Custom node painting with explored/unexplored/external visual states
- Handles click, hover, drag, zoom interactions
- ResizeObserver for responsive sizing

### GraphSidePanel (`src/app/components/graph-side-panel.ts`)

- Right-side panel showing selected note content
- Uses `MarkdownRenderer.render()` for full note rendering
- Toggle explored/unexplored button
- Close button

### GraphControls (`src/app/components/graph-controls.ts`)

- Search input with debounced filtering
- Stats display (node count, link count, explored ratio)
- Explored filter buttons (All / Explored / New)

### GraphZoomControls (`src/app/components/graph-zoom-controls.ts`)

- Zoom in/out, fit to screen, reset view

### GraphDataBuilder (`src/app/services/graph-data-builder.ts`)

- Transforms BasesEntry[] + metadataCache into GraphData
- Reads explored status from frontmatter
- Builds links from resolvedLinks
- Optionally includes external nodes (linked but not in Base)
- Deduplicates bidirectional links

## Data Flow

1. Obsidian Base query produces BasesEntry[] (files matching filter)
2. GraphDataBuilder reads each entry's frontmatter for explored status
3. GraphDataBuilder reads metadataCache.resolvedLinks for connections
4. Produces GraphData { nodes: GraphNode[], links: GraphLink[] }
5. force-graph renders the graph on Canvas
6. User clicks node -> side panel shows embedded note
7. User toggles explored -> frontmatter updated via processFrontMatter
8. Obsidian fires metadata change -> onDataUpdated -> graph rebuilds
```

- [ ] **Step 2: Update Domain Model**

Write `documentation/Domain Model.md`:

```markdown
# Domain Model

## GraphNode

A vault note represented as a graph node.

- `id`: File path (unique)
- `name`: File basename
- `explored`: Boolean from frontmatter property (default: `explored`)
- `connectionCount`: Number of links to other nodes
- `external`: Whether this node is outside the Base filter

## GraphLink

A connection between two notes derived from wiki-links.

- `source`: Source file path
- `target`: Target file path

## ExploredFilter

Filter mode: `'all'` | `'explored'` | `'unexplored'`

## Explored Property

- Frontmatter boolean property (configurable name, default: `explored`)
- Missing property = `false` (unexplored)
- Set via `app.fileManager.processFrontMatter()`
```

- [ ] **Step 3: Update Configuration**

Write `documentation/Configuration.md`:

```markdown
# Configuration

## Global Settings

| Setting                   | Type   | Default    | Description                                   |
| ------------------------- | ------ | ---------- | --------------------------------------------- |
| Default explored property | string | `explored` | Frontmatter property name for explored status |

## View Options (per Base instance)

| Option                             | Type     | Default    | Description                              |
| ---------------------------------- | -------- | ---------- | ---------------------------------------- |
| Explored property name             | text     | `explored` | Override explored property for this view |
| Show linked notes outside the base | toggle   | `false`    | Include external linked nodes            |
| Filter by explored status          | dropdown | `all`      | All / Explored only / Unexplored only    |
```

- [ ] **Step 4: Create history entry**

Write `documentation/history/2026-04-07.md`:

```markdown
# 2026-04-07

## Accomplished

- Initial implementation of Graph Explorer Base View plugin
- Custom BasesView type registered via registerBasesView()
- Force-directed graph rendering using force-graph library
- Explored/unexplored visual states on graph nodes
- Side panel with full note rendering via MarkdownRenderer
- Toggle explored status via frontmatter property
- Search and filter controls (All/Explored/Unexplored)
- Zoom controls
- External node support (linked notes outside Base filter)
- Graph data builder with link deduplication

## Key Decisions

- Using force-graph (vanilla JS) instead of react-force-graph-2d (no React dependency)
- MarkdownRenderer.render() for note embedding (public API, no internal dependencies)
- Explored status via frontmatter property (configurable name, missing = false)
- Canvas-based rendering for performance with large graphs

## Domain Model

- GraphNode, GraphLink, GraphData types defined
- ExploredFilter type for view filtering
```

- [ ] **Step 5: Commit**

```bash
git add documentation/
git commit -m "docs: add architecture, domain model, configuration, and history"
```

---

### Task 14: Business Rules Documentation

**Files:**

- Modify: `documentation/Business Rules.md`

- [ ] **Step 1: Document business rules**

Append to `documentation/Business Rules.md`:

```markdown
---

## Explored Status

- The explored status of a note is determined by a boolean frontmatter property (default name: `explored`)
- If the property is missing from a note's frontmatter, the note is considered **unexplored** (value is `false`)
- The property name is configurable both globally (plugin settings) and per-view (view options)
- Toggling explored status writes the property to the note's frontmatter via `processFrontMatter()`

## Graph Data

- Connections between nodes are derived from Obsidian's `metadataCache.resolvedLinks`
- Bidirectional links are deduplicated (A->B and B->A produce one edge)
- External nodes (linked but not in the Base filter) are only shown when the "Show linked notes outside the base" option is enabled
- Node size is proportional to connection count (degree)
```

- [ ] **Step 2: Commit**

```bash
git add "documentation/Business Rules.md"
git commit -m "docs: document explored status and graph data business rules"
```
