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
