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
