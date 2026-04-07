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
- `created`: Creation timestamp in ms (from frontmatter `created`/`date` or file stat), nullable
- `tags`: Array of tags from the note
- `frontmatter`: All raw frontmatter properties (for generic visualization)
- `frontier`: Whether this is an unresolved link target (note doesn't exist)
- `batchSelected`: Whether this node is part of a batch selection (optional)

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
- `frontierCount`: Number of frontier nodes
- `coveragePercent`: Explored / (explored + unexplored) as percentage

## ExploredFilter

Filter mode: `'all'` | `'explored'` | `'unexplored'`

## ViewPreset

Named configuration bundles: `key`, `name`, `description`, `config` (key-value pairs for view options).

Built-in presets: `wiki-explorer`, `exploration-progress`, `role-overview`.

## Explored Property

- Frontmatter boolean property (configurable name, default: `explored`)
- Missing property = `false` (unexplored)
- Set via `app.fileManager.processFrontMatter()`
- Also updated optimistically on the in-memory `GraphNode` for immediate UI feedback

## Confidence Property

- Read from frontmatter `confidence` or `wiki_confidence`
- Values: `high`, `medium`, `low`, `uncertain` (anything else = `unknown`)

## Wiki Role Property

- Read from frontmatter `wiki_role`
- Values: `article`, `index`, `log`, `source_summary` (anything else = `unknown`)
- Determines node shape in the graph
