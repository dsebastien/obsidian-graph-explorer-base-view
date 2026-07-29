---
title: Configuration
nav_order: 3
---

# Configuration

## Plugin settings

Global settings available in **Settings > Community plugins > Graph Explorer Base View**. These define the defaults used when a new Base view is created. After creation, each view's settings are independent.

| Setting                   | Type     | Default           | Description                                                                                   |
| ------------------------- | -------- | ----------------- | --------------------------------------------------------------------------------------------- |
| Default explored property | text     | `explored`        | Frontmatter property name used to track exploration status                                    |
| Maturity property         | text     | `maturity`        | Frontmatter property name used to read/write article maturity level                           |
| Graduated notes property  | text     | `graduated_notes` | Frontmatter property name used to read the list of graduated permanent notes                  |
| Default color scheme      | dropdown | `explored`        | How nodes are colored in new views (explored, confidence, wiki_role, maturity, created, tags) |
| Default size scheme       | dropdown | `connections`     | How nodes are sized in new views (connections, uniform)                                       |
| Show frontier by default  | toggle   | `false`           | Whether new views show frontier (unresolved link) nodes                                       |
| Show external by default  | toggle   | `false`           | Whether new views show external (linked but outside Base) nodes                               |
| Default explored filter   | dropdown | `all`             | Default filter for explored status in new views                                               |
| Default node spacing      | slider   | `1500`            | Force repulsion strength between nodes in new views (200–5000)                                |

## View options

Each Base view instance has its own settings, initialized from plugin defaults at creation time. Access these via the Base view's configuration:

| Option                                 | Type     | Default     | Description                                                   |
| -------------------------------------- | -------- | ----------- | ------------------------------------------------------------- |
| Explored property name                 | text     | from plugin | Frontmatter property for explored status                      |
| Maturity property name                 | text     | from plugin | Frontmatter property for maturity level                       |
| Graduated notes property name          | text     | from plugin | Frontmatter property for graduated notes list                 |
| Show linked notes outside the base     | toggle   | from plugin | Include nodes linked from the Base but not matching its query |
| Show frontier nodes (unresolved links) | toggle   | from plugin | Show placeholder nodes for links to non-existent notes        |
| Filter by explored status              | dropdown | from plugin | Show all notes, explored only, or unexplored only             |
| Color nodes by                         | dropdown | from plugin | Property used for node coloring                               |
| Size nodes by                          | dropdown | from plugin | Property used for node sizing                                 |
| Node spacing                           | slider   | from plugin | Force repulsion strength between nodes (200–5000)             |
| View preset                            | dropdown | from plugin | Apply a built-in preset configuration                         |

All view options inherit their initial value from plugin settings. After that, they are independent — changing plugin settings does not affect existing views.

## View presets

Four built-in presets configure multiple view options at once:

| Preset               | Color by   | Size by     | Frontier | External | Description                                          |
| -------------------- | ---------- | ----------- | -------- | -------- | ---------------------------------------------------- |
| LLM Wiki Explorer    | confidence | connections | yes      | yes      | Quality review: colors show confidence, reveals gaps |
| Exploration Progress | explored   | connections | no       | no       | Reading tracker: green = reviewed, gray = untouched  |
| Role Overview        | wiki_role  | connections | no       | no       | Structure map: see note types and organization       |
| Maturity Pipeline    | maturity   | connections | no       | no       | Writing pipeline: track article depth and readiness  |

## Frontmatter properties

The plugin reads the following frontmatter properties from notes:

| Property                          | Type          | Values                                      | Description                                                              |
| --------------------------------- | ------------- | ------------------------------------------- | ------------------------------------------------------------------------ |
| `explored`                        | boolean       | `true` / `false`                            | Whether the note has been reviewed (property name is configurable)       |
| `confidence` or `wiki_confidence` | string        | `high`, `medium`, `low`, `uncertain`        | Confidence level of the note's content                                   |
| `wiki_role`                       | string        | `article`, `index`, `log`, `source_summary` | Structural role in a wiki                                                |
| `maturity`                        | string        | `stub`, `draft`, `substantial`, `mature`    | Article depth and graduation readiness (property name configurable)      |
| `graduated_notes`                 | list          | list of strings                             | Permanent notes extracted from this article (property name configurable) |
| `created` or `date`               | string/number | ISO date or timestamp                       | Creation date (used for color-by-date mode)                              |
| `tags`                            | array         | list of strings                             | Note tags (first tag used for color-by-tags mode)                        |

Any other frontmatter properties are available for color-by and size-by visualization.

## Maturity editing

The plugin can both read and write maturity levels. You can set a note's maturity from:

- **Side panel** — color-coded dropdown in the action buttons row
- **Context menu** — right-click a node and pick from the 4 maturity levels
- **Batch actions** — select multiple nodes and set maturity on all at once

Setting "No maturity" removes the property from the note's frontmatter.

## Node position persistence

Dragged node positions are saved in each view's configuration and restored when the view is reopened. Positions for files that no longer exist in the vault are automatically cleaned up.
