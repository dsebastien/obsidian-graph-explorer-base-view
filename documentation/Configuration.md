# Configuration

## Global Settings

Plugin settings define defaults for new views. After a view is created, its settings are independent.

| Setting                   | Type    | Default           | Description                                                                           |
| ------------------------- | ------- | ----------------- | ------------------------------------------------------------------------------------- |
| Default explored property | string  | `explored`        | Frontmatter property name for explored status                                         |
| Maturity property         | string  | `maturity`        | Frontmatter property name for maturity level                                          |
| Graduated notes property  | string  | `graduated_notes` | Frontmatter property name for graduated notes list                                    |
| Default color scheme      | string  | `explored`        | Node coloring in new views (explored, confidence, wiki_role, maturity, created, tags) |
| Default size scheme       | string  | `connections`     | Node sizing in new views (connections, uniform)                                       |
| Show frontier by default  | boolean | `false`           | Whether new views show frontier nodes                                                 |
| Show external by default  | boolean | `false`           | Whether new views show external nodes                                                 |
| Default explored filter   | string  | `all`             | Default explored filter (all, explored, unexplored)                                   |
| Default preset            | string  | `""`              | View preset key (empty = custom)                                                      |
| Node spacing              | number  | `1500`            | Force repulsion strength (200–5000)                                                   |

## View Options (per Base instance)

Each view inherits plugin settings as initial defaults, then operates independently.

| Option                                 | Type     | Default     | Description                                          |
| -------------------------------------- | -------- | ----------- | ---------------------------------------------------- |
| Explored property name                 | text     | from plugin | Frontmatter property for explored status             |
| Maturity property name                 | text     | from plugin | Frontmatter property for maturity level              |
| Graduated notes property name          | text     | from plugin | Frontmatter property for graduated notes list        |
| Show linked notes outside the base     | toggle   | from plugin | Include external linked nodes                        |
| Show frontier nodes (unresolved links) | toggle   | from plugin | Show placeholder nodes for non-existent link targets |
| Filter by explored status              | dropdown | from plugin | All / Explored only / Unexplored only                |
| Color nodes by                         | dropdown | from plugin | Property for node coloring                           |
| Size nodes by                          | dropdown | from plugin | Property for node sizing                             |
| View preset                            | dropdown | from plugin | Apply a built-in preset                              |

## Canvas Controls (runtime, not persisted)

| Control        | Range    | Default | Description             |
| -------------- | -------- | ------- | ----------------------- |
| Spacing slider | 200–5000 | 1500    | Node repulsion distance |
| Size slider    | 20–300%  | 100%    | Node scale multiplier   |
| Text slider    | 20–300%  | 100%    | Label scale multiplier  |

## Persisted View State

| Key           | Type | Description                                |
| ------------- | ---- | ------------------------------------------ |
| nodePositions | JSON | Dragged node positions, keyed by file path |
