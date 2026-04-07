# Architecture

## Overview

Graph Explorer Base View is an Obsidian plugin that registers a custom Base view type (`graph-explorer`). The view renders notes from an Obsidian Base as a force-directed graph with rich visualization driven by note metadata.

## Components

### Plugin (`src/app/plugin.ts`)

- Registers the `graph-explorer` Base view type via `registerBasesView()`
- Manages global settings (explored property, default color/size schemes, spacing, frontier toggle)
- Settings tab for plugin-wide configuration
- Dispatches `graph-explorer:settings-changed` custom event on save

### GraphExplorerView (`src/app/views/graph-explorer/graph-explorer-view.ts`)

- `BasesView` subclass, main orchestrator
- Receives data updates from Obsidian Bases via `onDataUpdated()` (debounced at 50ms)
- Coordinates graph canvas, side panel, controls, zoom controls, and context menu
- Handles keyboard events (Tab, Arrow keys, Enter, Escape)
- Manages presets via `VIEW_PRESETS` from graph-types
- Syncs plugin settings and per-view options to canvas

### GraphCanvas (`src/app/components/graph-canvas.ts`)

- Wraps `force-graph` library for Canvas 2D rendering
- Custom node painting with concentric rings: explored (innermost, green), confidence, selected (purple), focused (yellow), batch (blue dashed)
- Node shapes by wiki role: circle (article), diamond (index), square (log), hexagon (source_summary)
- Smooth fade-in/fade-out transitions when nodes change highlight state (exponential convergence, FADE_SPEED=7)
- Per-node alpha tracking via `nodeAlphas` Map for interpolated dimming
- Color modes: explored, confidence, wiki_role, created, tags, custom frontmatter properties
- Size modes: connection count, uniform
- Adjacency map for keyboard neighbor navigation
- Batch selection support
- Handles click (with double-click detection), hover, drag, zoom interactions
- ResizeObserver for responsive sizing

### GraphSidePanel (`src/app/components/graph-side-panel.ts`)

- Right-side resizable panel (240px–70% viewport width)
- Shows selected note content via `MarkdownRenderer.render()`
- Header with clickable title, close button, and metadata badges (external, frontier, wiki_role, confidence, tags)
- Action buttons: toggle explored, copy markdown
- Internal links navigate in-panel if target is in graph, otherwise open in new tab
- Middle-click always opens in new tab
- External links open in browser

### GraphControls (`src/app/components/graph-controls.ts`)

- Collapsible overlay panel (top-left, 240px fixed width)
- Search input with debounced filtering (300ms)
- Stats display: total nodes, links, explored count, frontier count
- Progress bar with coverage percentage
- Confidence distribution display (colored dots per level)
- Three sliders: spacing (200–5000), node size (20–300%), text size (20–300%)
- Filter buttons: All / Explored / New
- Batch actions section (hidden until nodes are batch-selected)

### GraphZoomControls (`src/app/components/graph-zoom-controls.ts`)

- Vertical button stack (right side, vertically centered)
- Zoom in (2x), zoom out (0.5x), fit to screen, reset view

### GraphContextMenu (`src/app/components/graph-context-menu.ts`)

- Right-click popup menu with boundary checking
- Actions: open in new tab, toggle explored, copy wikilink, add/remove from batch selection
- Auto-dismiss on outside click

### GraphDataBuilder (`src/app/services/graph-data-builder.ts`)

- Transforms `BasesEntry[]` + `metadataCache` into `GraphData`
- Reads explored status from configurable frontmatter property
- Extracts confidence, wiki_role, created date, tags, and all frontmatter
- Builds links from `metadataCache.resolvedLinks`
- Deduplicates bidirectional links
- Optionally includes external nodes (linked but outside Base filter)
- Optionally includes frontier nodes (unresolved link targets)
- Calculates connection counts per node

### View Options (`src/app/views/graph-explorer/graph-explorer-options.ts`)

- Defines per-view configurable options via `getGraphExplorerViewOptions()`
- Options: explored property name, show external, show frontier, explored filter, color by, size by, preset

## Data Flow

1. Obsidian Base query produces `BasesEntry[]` (files matching filter)
2. `onDataUpdated()` triggers debounced rebuild
3. `GraphDataBuilder` reads frontmatter and `metadataCache.resolvedLinks`
4. Produces `GraphData { nodes: GraphNode[], links: GraphLink[] }`
5. View syncs config (color by, size by, filters) to canvas
6. `force-graph` runs D3 force simulation and renders on Canvas
7. Custom `paintNode` draws shapes, rings, labels with per-node fade transitions
8. User clicks node → side panel shows rendered note content
9. User toggles explored → `node.explored` updated optimistically + frontmatter updated via `processFrontMatter()`
10. Obsidian fires metadata change → `onDataUpdated()` → graph rebuilds

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
      graph-zoom-controls.ts   # Zoom buttons
      graph-context-menu.ts    # Right-click menu
    services/
      graph-data-builder.ts    # Base entries → GraphData transformation
    utils/
      frontmatter-utils.ts     # Read/write frontmatter properties
      log.ts                   # Console logging utility
  styles.src.css               # Tailwind source (generates root styles.css)
```
