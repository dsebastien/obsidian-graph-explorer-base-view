# Configuration

## Global Settings

| Setting                   | Type    | Default       | Description                                                                 |
| ------------------------- | ------- | ------------- | --------------------------------------------------------------------------- |
| Default explored property | string  | `explored`    | Frontmatter property name for explored status                               |
| Default color scheme      | string  | `explored`    | Node coloring in new views (explored, confidence, wiki_role, created, tags) |
| Default size scheme       | string  | `connections` | Node sizing in new views (connections, uniform)                             |
| Show frontier by default  | boolean | `false`       | Whether new views show frontier nodes                                       |
| Default preset            | string  | `""`          | View preset key (empty = custom)                                            |
| Node spacing              | number  | `1500`        | Force repulsion strength (200–5000)                                         |

## View Options (per Base instance)

| Option                                 | Type     | Default       | Description                                                                      |
| -------------------------------------- | -------- | ------------- | -------------------------------------------------------------------------------- |
| Explored property name                 | text     | `explored`    | Override explored property for this view                                         |
| Show linked notes outside the base     | toggle   | `false`       | Include external linked nodes                                                    |
| Show frontier nodes (unresolved links) | toggle   | `false`       | Show placeholder nodes for non-existent link targets                             |
| Filter by explored status              | dropdown | `all`         | All / Explored only / Unexplored only                                            |
| Color nodes by                         | dropdown | `explored`    | Property for node coloring (explored, confidence, wiki_role, created, tags)      |
| Size nodes by                          | dropdown | `connections` | Property for node sizing (connections, uniform)                                  |
| View preset                            | dropdown | `""` (Custom) | Apply a built-in preset (LLM Wiki Explorer, Exploration Progress, Role Overview) |

## Canvas Controls (runtime, not persisted)

| Control        | Range    | Default | Description             |
| -------------- | -------- | ------- | ----------------------- |
| Spacing slider | 200–5000 | 1500    | Node repulsion distance |
| Size slider    | 20–300%  | 100%    | Node scale multiplier   |
| Text slider    | 20–300%  | 100%    | Label scale multiplier  |
