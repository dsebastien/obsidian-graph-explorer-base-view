# Configuration

## Plugin settings

Global settings available in **Settings > Community plugins > Graph Explorer Base View**:

| Setting                   | Type     | Default       | Description                                                                         |
| ------------------------- | -------- | ------------- | ----------------------------------------------------------------------------------- |
| Default explored property | text     | `explored`    | Frontmatter property name used to track exploration status                          |
| Default color scheme      | dropdown | `explored`    | How nodes are colored in new views (explored, confidence, wiki_role, created, tags) |
| Default size scheme       | dropdown | `connections` | How nodes are sized in new views (connections, uniform)                             |
| Show frontier by default  | toggle   | `false`       | Whether new views show frontier (unresolved link) nodes                             |
| Node spacing              | slider   | `1500`        | Force repulsion strength between nodes (200–5000)                                   |

## View options

Each Base view instance can override plugin defaults. Access these via the Base view's configuration:

| Option                                 | Type     | Default       | Description                                                   |
| -------------------------------------- | -------- | ------------- | ------------------------------------------------------------- |
| Explored property name                 | text     | `explored`    | Override the frontmatter property for this view               |
| Show linked notes outside the base     | toggle   | `false`       | Include nodes linked from the Base but not matching its query |
| Show frontier nodes (unresolved links) | toggle   | `false`       | Show placeholder nodes for links to non-existent notes        |
| Filter by explored status              | dropdown | `all`         | Show all notes, explored only, or unexplored only             |
| Color nodes by                         | dropdown | `explored`    | Property used for node coloring                               |
| Size nodes by                          | dropdown | `connections` | Property used for node sizing                                 |
| View preset                            | dropdown | `Custom`      | Apply a built-in preset configuration                         |

## View presets

Three built-in presets configure multiple view options at once:

| Preset               | Color by   | Size by     | Frontier | External | Description                                     |
| -------------------- | ---------- | ----------- | -------- | -------- | ----------------------------------------------- |
| LLM Wiki Explorer    | confidence | connections | yes      | yes      | Focus on article quality and coverage           |
| Exploration Progress | explored   | connections | no       | no       | Track what you've reviewed vs what's new        |
| Role Overview        | wiki_role  | connections | no       | no       | See the structural roles in your knowledge base |

## Frontmatter properties

The plugin reads the following frontmatter properties from notes:

| Property                          | Type          | Values                                      | Description                                                        |
| --------------------------------- | ------------- | ------------------------------------------- | ------------------------------------------------------------------ |
| `explored`                        | boolean       | `true` / `false`                            | Whether the note has been reviewed (property name is configurable) |
| `confidence` or `wiki_confidence` | string        | `high`, `medium`, `low`, `uncertain`        | Confidence level of the note's content                             |
| `wiki_role`                       | string        | `article`, `index`, `log`, `source_summary` | Structural role in a wiki                                          |
| `created` or `date`               | string/number | ISO date or timestamp                       | Creation date (used for color-by-date mode)                        |
| `tags`                            | array         | list of strings                             | Note tags (first tag used for color-by-tags mode)                  |

Any other frontmatter properties are available for color-by and size-by visualization.
