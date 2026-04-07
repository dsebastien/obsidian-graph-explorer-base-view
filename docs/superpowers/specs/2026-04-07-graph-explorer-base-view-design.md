# Graph Explorer Base View - Design Spec

## Overview

An Obsidian plugin that adds a custom Base view type rendering notes as a force-directed graph. Notes have a configurable "explored" boolean property, and the graph visually distinguishes explored from unexplored notes. Connections are derived from wiki-links between notes. Clicking a node opens a side panel with the full embedded note for reading/editing.

**Primary use case**: Exploring an LLM-maintained knowledge wiki in Obsidian, tracking what you've read, seeing relationships, and discovering unexplored content.

## Architecture

### Plugin Structure

- Registers a single custom Base view type via `registerBasesView()`
- The view renders a Canvas-based force-directed graph using `force-graph` (vanilla JS, no React)
- Settings tab for global plugin configuration
- View options for per-Base-instance configuration

### Components

1. **GraphExplorerView** (`BasesView` subclass) - Main view orchestrator
2. **GraphCanvas** - Wraps `force-graph`, handles rendering, node painting, interactions
3. **GraphSidePanel** - Right-side panel with embedded note editor (Obsidian's CodeMirror embed)
4. **GraphControls** - Overlay controls: search, filters, zoom
5. **GraphDataBuilder** - Transforms Base entries + metadata cache into graph data (nodes + links)

### Data Flow

```
Base entries (from Obsidian Bases)
    ↓
GraphDataBuilder reads entries + metadataCache resolved links
    ↓
Builds: GraphNode[] (id, name, explored, connections) + GraphLink[] (source, target)
    ↓
Optionally includes "external" nodes (linked but not in the Base filter)
    ↓
force-graph renders on Canvas
    ↓
User clicks node → side panel shows embedded note
    ↓
User toggles explored → frontmatter updated → node re-styled
```

## Graph Rendering

### Library

`force-graph` (npm: `force-graph`) - the vanilla JS version of `react-force-graph-2d` used in concept-cards. Canvas-based, d3-force physics, supports custom node painting.

### Node Visual States

| State                   | Visual                                         |
| ----------------------- | ---------------------------------------------- |
| Unexplored              | Default circle, muted opacity (~60%), no ring  |
| Explored                | Full opacity, green ring (rgba(34,197,94,0.6)) |
| Selected                | Pink/accent stroke ring, full opacity          |
| Hovered                 | Glow effect + label shown                      |
| External (outside Base) | Smaller, dashed outline, very dim (~30%)       |

### Node Sizing

Based on connection count (degree): `Math.max(3, Math.min(12, 3 + degree * 0.4))`

### Edge Styling

- Internal links (both nodes in Base): solid, semi-transparent
- External links (one node outside Base): dashed/dimmer
- Theme-aware colors (dark/light mode via Obsidian CSS variables)

### Interactions

- **Click node**: Select it, open side panel with embedded note
- **Hover node**: Glow effect, show label, highlight neighbors
- **Drag node**: Reposition (physics adapts)
- **Scroll**: Zoom in/out
- **Pan**: Click-drag background
- **Double-click node**: Open note in a new Obsidian tab

## Side Panel

- Right-side panel (320-400px width)
- Header: note title, explored status badge, toggle explored button
- Body: full embedded note using Obsidian's embeddable editor (same approach as obsidian-journal-base's EmbeddableEditorService)
- Supports view/edit/source modes
- Close button to dismiss

## View Options (per-Base-instance)

Configured via `registerBasesView` options API:

| Option              | Type     | Default      | Description                                                  |
| ------------------- | -------- | ------------ | ------------------------------------------------------------ |
| `exploredProperty`  | text     | `"explored"` | Frontmatter property name for explored status                |
| `showExternalNodes` | toggle   | `false`      | Show nodes linked from Base notes but not in the Base filter |
| `exploredFilter`    | dropdown | `"all"`      | Filter: all / explored / unexplored                          |

## Plugin Settings (global)

| Setting          | Type | Default | Description                                  |
| ---------------- | ---- | ------- | -------------------------------------------- |
| (none initially) |      |         | Global settings can be added later as needed |

## Graph Controls Overlay

Positioned top-left, over the graph canvas:

1. **Search**: Text input, highlights matching nodes by name
2. **Stats**: Node count, link count, explored/total ratio
3. **Explored filter**: Three buttons (All / Explored / New)
4. **Zoom controls**: Positioned right-center (+, -, fit, reset)

## Technical Decisions

- **No React**: Pure DOM manipulation + Canvas, consistent with Obsidian plugin patterns
- **force-graph**: Lightweight (~50KB), Canvas-based, well-maintained, same engine as concept-cards reference
- **Frontmatter for explored state**: Persists across sessions, works with Obsidian's metadata system
- **Embeddable editor**: Uses Obsidian's internal embed API for note rendering, same as obsidian-journal-base
- **Debounced updates**: Graph rebuilds debounced (50-100ms) when Base data changes

## File Structure

```
src/
  main.ts                          # Plugin entry, exports GraphExplorerPlugin
  app/
    plugin.ts                      # Main plugin class, registerBasesView
    settings/
      settings-tab.ts              # Global settings UI
    types/
      plugin-settings.intf.ts      # PluginSettings interface
      graph-types.ts               # GraphNode, GraphLink, GraphData interfaces
    views/
      graph-explorer/
        graph-explorer-view.ts     # BasesView subclass, orchestrator
        graph-explorer-options.ts  # ViewOption definitions
        graph-explorer.constants.ts
    components/
      graph-canvas.ts              # force-graph wrapper, custom node painting
      graph-side-panel.ts          # Side panel with embedded note
      graph-controls.ts            # Search, filters, stats overlay
      graph-zoom-controls.ts       # Zoom +/- fit reset buttons
    services/
      graph-data-builder.ts        # Base entries → graph data
      embeddable-editor.service.ts # Embedded CodeMirror editor
    utils/
      frontmatter-utils.ts         # Read/write explored property
  utils/
    log.ts                         # Logging (already exists)
  styles.src.css                   # Tailwind + custom styles
```

## Error Handling

- Missing `explored` property: treat as unexplored (false)
- No links in a note: render as isolated node
- Empty Base: show "No notes to display" message
- force-graph load failure: show error message in view container

## Testing Strategy

- Unit tests for `GraphDataBuilder` (entry → node/link transformation)
- Unit tests for frontmatter utilities
- Manual testing for graph rendering and interactions (Canvas is hard to unit test)
