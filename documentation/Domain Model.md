# Domain Model

## GraphNode

A vault note represented as a graph node.

- `id`: File path (unique identifier)
- `name`: File basename without extension
- `explored`: Boolean from frontmatter property (default: `explored`)
- `connectionCount`: Number of links to other nodes in the graph
- `external`: Whether this node is outside the Base filter
- `confidence`: Confidence level — `high` | `medium` | `low` | `uncertain` | `unknown`
- `wikiRole`: Structural role — `article` | `index` | `log` | `source_summary` | `unknown`
- `maturity`: Maturity level — `stub` | `draft` | `substantial` | `mature` | `unknown`
- `graduatedNotes`: Array of graduated permanent note names (from frontmatter)
- `created`: Creation timestamp in ms (from frontmatter `created`/`date` or file stat), nullable
- `tags`: Array of tags from the note
- `frontmatter`: All raw frontmatter properties (for generic visualization)
- `frontier`: Whether this is an unresolved link target (note doesn't exist)
- `batchSelected`: Whether this node is part of a batch selection (optional)
- `x`, `y`: Current position (managed by force-graph)
- `fx`, `fy`: Fixed/pinned position (set when user drags a node)

## GraphLink

A connection between two notes derived from wiki-links.

- `source`: Source file path
- `target`: Target file path
- `sourceRole`: Wiki role of the source node (for edge styling, optional)
- `toFrontier`: Whether this link points to a frontier node (optional)

## GraphData

- `nodes`: `GraphNode[]`
- `links`: `GraphLink[]`

## GraphStats

- `totalNodes`: Total node count
- `totalLinks`: Total link count
- `exploredCount`: Number of explored notes
- `unexploredCount`: Number of unexplored notes
- `confidenceDistribution`: Count per confidence level
- `roleDistribution`: Count per wiki role
- `maturityDistribution`: Count per maturity level
- `graduatedCount`: Number of notes with graduated permanent notes
- `frontierCount`: Number of frontier nodes
- `coveragePercent`: Explored / (explored + unexplored) as percentage

## ExploredFilter

Filter mode: `'all'` | `'explored'` | `'unexplored'`

## MaturityLevel

Maturity levels: `'stub'` | `'draft'` | `'substantial'` | `'mature'` | `'unknown'`

## ViewPreset

Named configuration bundles: `key`, `name`, `description`, `config` (key-value pairs for view options).

Built-in presets: `wiki-explorer`, `exploration-progress`, `role-overview`, `maturity-pipeline`.

## Explored Property

- Frontmatter boolean property (configurable name, default: `explored`)
- Missing property = `false` (unexplored)
- Set via `app.fileManager.processFrontMatter()`
- Also updated optimistically on the in-memory `GraphNode` for immediate UI feedback
- Visual encoding: explored = solid fill + green border; unexplored = hollow outline

## Confidence Property

- Read from frontmatter `confidence` or `wiki_confidence`
- Values: `high`, `medium`, `low`, `uncertain` (anything else = `unknown`)

## Wiki Role Property

- Read from frontmatter `wiki_role`
- Values: `article`, `index`, `log`, `source_summary` (anything else = `unknown`)
- Determines node shape in the graph

## Maturity Property

- Read from and written to frontmatter (configurable property name, default: `maturity`)
- Values: `stub`, `draft`, `substantial`, `mature` (anything else = `unknown`)
- Editable from side panel dropdown, context menu, and batch actions
- Setting to `unknown` removes the property from frontmatter

## Graduated Notes Property

- Read from frontmatter (configurable property name, default: `graduated_notes`)
- Array of strings (permanent note names)
- Visual encoding: purple dot at top-right of node

## Node Position Persistence

- Positions saved as `{ x, y }` keyed by file path in the view's config
- Stored as JSON string under config key `nodePositions`
- Set on drag end via `onNodeDragEnd` callback
- Restored on graph load by setting `fx`/`fy` (pins the node)
- Stale entries (files no longer in vault) are pruned automatically on each graph rebuild

## Group Drag (Shift+Drag)

- Shift+drag moves a node and all its direct neighbors as a cluster
- On drag start: captures relative offsets of all neighbors via adjacency map
- During drag: neighbors are temporarily pinned (`fx`/`fy`) at their offset from the dragged node
- On drag end: previously pinned neighbors update their saved positions; unpinned neighbors are released to the simulation
- Without Shift: standard single-node drag behavior
