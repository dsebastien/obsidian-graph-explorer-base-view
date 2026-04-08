# Architecture

## Overview

Graph Explorer Base View is an Obsidian plugin that registers a custom Base view type (`graph-explorer`). The view renders notes from an Obsidian Base as a force-directed graph with rich visualization driven by note metadata.

## Components

### Plugin (`src/app/plugin.ts`)

- Registers the `graph-explorer` Base view type via `registerBasesView()`
- Manages global settings (explored property, maturity property, graduated notes property, default color/size schemes, spacing, frontier/external toggles, explored filter)
- View options receive current plugin settings as defaults via `getGraphExplorerViewOptions(this.settings)`
- Settings tab for plugin-wide configuration
- Dispatches `graph-explorer:settings-changed` custom event on save
- Loads saved settings with type-safe validation per field

### GraphExplorerView (`src/app/views/graph-explorer/graph-explorer-view.ts`)

- `BasesView` subclass, main orchestrator
- Receives data updates from Obsidian Bases via `onDataUpdated()` (debounced at 50ms)
- Coordinates graph canvas, side panel, controls, zoom controls, legend, and context menu
- Handles keyboard events (Tab, Arrow keys, Enter, Escape)
- Manages presets via `VIEW_PRESETS` from graph-types
- Reads all settings from per-view `config` (no fallback to plugin settings at runtime)
- Manages node position persistence (save on drag, restore on load, prune stale entries)
- Builds legend config based on current color-by mode (color section + node style section)

### GraphCanvas (`src/app/components/graph-canvas.ts`)

- Wraps `force-graph` library for Canvas 2D rendering
- Custom node painting: solid fill + green border (explored) or hollow outline (unexplored)
- Interaction rings only: selected (purple), focused (yellow), batch (blue dashed)
- Node shapes by wiki role: circle (article), diamond (index), square (log), hexagon (source_summary)
- Graduated indicator: small purple dot at top-right for nodes with graduated notes
- Smooth fade-in/fade-out transitions when nodes change highlight state (exponential convergence, FADE_SPEED=7)
- Per-node alpha tracking via `nodeAlphas` Map for interpolated dimming
- Color modes: explored, confidence, wiki_role, maturity, created, tags, custom frontmatter properties
- Size modes: connection count, uniform
- Node position persistence: accepts saved positions via `setSavedPositions()`, pins nodes with `fx`/`fy` on drag end
- Adjacency map for keyboard neighbor navigation
- Batch selection support
- Handles click (with double-click detection), hover, drag, drag-end, zoom interactions
- ResizeObserver for responsive sizing

### GraphSidePanel (`src/app/components/graph-side-panel.ts`)

- Right-side resizable panel (240px–70% viewport width)
- Shows selected note content via `MarkdownRenderer.render()`
- Header with clickable title, close button, and metadata badges (external, frontier, wiki_role, confidence, graduated notes count, tags)
- Action buttons: toggle explored, maturity dropdown (color-coded by current level), copy markdown
- Maturity dropdown updates styling dynamically on change, includes emoji prefixes per level
- Callbacks: `onToggleExplored`, `onSetMaturity`, `onClose`, `onNavigateToNode`
- Internal links navigate in-panel if target is in graph, otherwise open in new tab
- Middle-click always opens in new tab
- External links open in browser

### GraphControls (`src/app/components/graph-controls.ts`)

- Collapsible overlay panel (top-left, 240px fixed width)
- Search input with debounced filtering (300ms)
- Stats display: total nodes, links, explored count, frontier count
- Progress bar with coverage percentage
- Confidence distribution display (colored dots per level)
- Maturity distribution display (colored dots per level + graduated count)
- Three sliders: spacing (200–5000), node size (20–300%), text size (20–300%)
- Filter buttons: All / Explored / New
- Batch actions section (hidden until nodes are batch-selected): toggle explored button + maturity dropdown

### GraphLegend (`src/app/components/graph-legend.ts`)

- Toggleable panel near zoom controls (bottom-right)
- Displays multiple sections with separator lines
- Supports three indicator styles: swatch (filled circle), ring (hollow circle), dot (small filled circle)
- Updated dynamically when color-by mode changes
- Two sections: color meanings + node style (explored/unexplored/graduated)

### GraphZoomControls (`src/app/components/graph-zoom-controls.ts`)

- Vertical button stack (right side, vertically centered)
- Zoom in (2x), zoom out (0.5x), fit to screen, reset view

### GraphContextMenu (`src/app/components/graph-context-menu.ts`)

- Right-click popup menu with boundary checking
- Actions: open in new tab, toggle explored, set maturity (4 level options with colored icons), copy wikilink, add/remove from batch selection
- Current maturity level is shown as disabled (grayed out)
- Auto-dismiss on outside click

### GraphDataBuilder (`src/app/services/graph-data-builder.ts`)

- Transforms `BasesEntry[]` + `metadataCache` into `GraphData`
- Reads explored status from configurable frontmatter property
- Extracts confidence, wiki_role, maturity, graduated_notes, created date, tags, and all frontmatter
- Maturity and graduated_notes property names are configurable (passed from view config)
- Builds links from `metadataCache.resolvedLinks`
- Deduplicates bidirectional links
- Optionally includes external nodes (linked but outside Base filter)
- Optionally includes frontier nodes (unresolved link targets)
- Calculates connection counts per node

### View Options (`src/app/views/graph-explorer/graph-explorer-options.ts`)

- Defines per-view configurable options via `getGraphExplorerViewOptions(settings)`
- Accepts `PluginSettings` to use as defaults for new views
- Options: explored property, maturity property, graduated notes property, show external, show frontier, explored filter, color by, size by, preset

## Data Flow

1. Obsidian Base query produces `BasesEntry[]` (files matching filter)
2. `onDataUpdated()` triggers debounced rebuild
3. `GraphDataBuilder` reads frontmatter and `metadataCache.resolvedLinks`
4. Produces `GraphData { nodes: GraphNode[], links: GraphLink[] }`
5. View loads saved node positions, prunes stale entries, passes to canvas
6. View syncs config (color by, size by, filters) to canvas and updates legend
7. `force-graph` runs D3 force simulation and renders on Canvas
8. Custom `paintNode` draws shapes with solid/hollow fill and green border for explored
9. User clicks node → side panel shows rendered note content
10. User toggles explored → `node.explored` updated optimistically + frontmatter updated via `processFrontMatter()`
11. User sets maturity → `node.maturity` updated optimistically + frontmatter updated
12. User drags node → position pinned and saved to view config
13. Obsidian fires metadata change → `onDataUpdated()` → graph rebuilds

## Settings Architecture

Plugin settings define defaults for new views. When a Base view is created, `getGraphExplorerViewOptions(this.settings)` generates view options with current plugin settings as default values. After creation, the view reads only from its own `config` — plugin settings and view settings are fully independent.

The only exception is `nodeSpacing`, which remains in plugin settings because Obsidian's Bases view options don't support a slider type.

## File Structure

```
src/
  app/
    plugin.ts                  # Plugin entry point, settings tab
    types/
      graph-types.ts           # GraphNode, GraphLink, GraphData, GraphStats, ViewPreset, VIEW_PRESETS
      plugin-settings.intf.ts  # PluginSettings interface and defaults
    views/graph-explorer/
      graph-explorer-view.ts   # BasesView orchestrator
      graph-explorer-options.ts # Per-view option definitions
    components/
      graph-canvas.ts          # Force-graph Canvas renderer
      graph-controls.ts        # Search, stats, sliders, filters
      graph-side-panel.ts      # Note detail panel
      graph-legend.ts          # Color legend panel
      graph-zoom-controls.ts   # Zoom buttons
      graph-context-menu.ts    # Right-click menu
    services/
      graph-data-builder.ts    # Base entries → GraphData transformation
    utils/
      frontmatter-utils.ts     # Read/write frontmatter properties
      log.ts                   # Console logging utility
  styles.src.css               # Tailwind source (generates root styles.css)
```
