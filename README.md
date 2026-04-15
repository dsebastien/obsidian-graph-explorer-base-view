# Graph Explorer Base View

An Obsidian plugin that adds a **custom Bases view** which renders notes as an interactive force-directed graph — purpose-built for exploring, tracking and growing a knowledge base note by note.

Where Obsidian's built-in graph shows the whole vault, Graph Explorer works on top of a **Base**: you define the filter, the graph shows only the notes that match, and the view stays scoped to that slice.

## What makes it different

- **Driven by a Base** — the set of notes displayed is whatever your Base query returns. Works naturally with Bases filters, tags, folders and properties.
- **Explored / unexplored tracking** — every note has an "explored" flag stored in its frontmatter. The graph makes it visually obvious what you've already processed and what is still new territory.
- **Maturity tracking** — track the evolution of each note through maturity levels, with a "graduated notes" concept for notes that have matured into dedicated standalone notes.
- **Rich visual language** — node shape encodes the note's role (article, index, log, source summary); borders, rings and a small indicator dot encode explored state, maturity, confidence and whether the note has graduated children.
- **Per-view configuration** — every Base using this view has its own independent settings: explored property name, color mode, size mode, filters, external/frontier toggles, preset.

## Main features

### Interactive graph canvas

- Force-directed layout via `force-graph` on a 2D canvas.
- Color nodes by: explored status, confidence, wiki role, maturity, creation date, tags or any frontmatter property.
- Size nodes by connection count or uniform.
- Drag a node to pin it; **Shift+drag** moves the node together with its direct neighbors as a cluster.
- Node positions are persisted per view.
- Smooth fade transitions on hover and selection — unconnected nodes dim to keep focus on what matters.
- Keyboard navigation: Tab, arrow keys, Enter, Escape.

### Side panel

- Click any node to open its rendered content in a resizable right-side panel.
- Header badges surface key metadata (external, frontier, wiki role, confidence, graduated count, tags).
- Toggle explored, change maturity level and copy the note as markdown directly from the panel.
- Internal links navigate in-panel when the target is in the graph, or open in a new tab otherwise.

### Controls overlay

- Debounced search with live filtering.
- Stats: total nodes, links, explored count, frontier count, coverage %.
- Confidence and maturity distribution indicators.
- Spacing, node size and text size sliders.
- Filter by explored / unexplored / all.
- Batch actions: select multiple nodes and toggle explored or set maturity in one go.

### Minimap, zoom & legend

- Bird's-eye **minimap** with viewport rectangle; click or drag to pan the main graph.
- Zoom controls: in, out, fit, reset.
- Toggleable legend that adapts to the current color mode.

### Context menu

- Right-click a node for quick actions: open in new tab, toggle explored, set maturity, copy wikilink, add/remove from batch selection.

## How it works

1. Create a Base that filters the notes you want to explore.
2. Add a view and pick **Graph Explorer** as the view type.
3. Configure the view's options (explored property, color mode, filters, …).
4. Explore: click nodes to read them, toggle explored as you process them, drag to arrange, set maturity as notes evolve.

Explored and maturity state live in the note's frontmatter, so the data is portable and plays nicely with the rest of your workflow.

## Requirements

- Obsidian `1.10.0` or later (Bases API).
- Desktop and mobile compatible.

## Installation

Until this plugin is listed in the community catalog, install manually:

1. Download `main.js`, `manifest.json` and `styles.css` from the latest release.
2. Copy them to `<Vault>/.obsidian/plugins/graph-explorer-base-view/`.
3. Reload Obsidian and enable the plugin in **Settings → Community plugins**.

## Development

See [DEVELOPMENT.md](./DEVELOPMENT.md) and [CONTRIBUTING.md](./CONTRIBUTING.md).

Common commands:

| Command             | Description                       |
| ------------------- | --------------------------------- |
| `bun install`       | Install dependencies              |
| `bun run dev`       | Development build with watch mode |
| `bun run build`     | Production build                  |
| `bun run tsc:watch` | Type check in watch mode          |
| `bun run lint`      | Run ESLint                        |
| `bun run format`    | Format with Prettier              |
| `bun test`          | Run tests                         |

## License

MIT — see [LICENSE](./LICENSE).

## Support

If this plugin is useful to you, you can support the work on [Buy Me a Coffee](https://www.buymeacoffee.com/dsebastien). Thanks! ❤️
