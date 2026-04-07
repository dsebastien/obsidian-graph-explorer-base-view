# Business Rules

This document defines the core business rules. These rules MUST be respected in all implementations unless explicitly approved otherwise.

---

## Documentation Guidelines

When a new business rule is mentioned:

1. Add it to this document immediately
2. Use a concise format (single line or brief paragraph)
3. Maintain precision - do not lose important details for brevity
4. Include rationale where it adds clarity

---

## Explored Status

- The explored status of a note is determined by a boolean frontmatter property (default name: `explored`)
- If the property is missing from a note's frontmatter, the note is considered **unexplored** (value is `false`)
- The property name is configurable both globally (plugin settings) and per-view (view options)
- Toggling explored status writes the property to the note's frontmatter via `processFrontMatter()`
- The in-memory `GraphNode.explored` is updated optimistically for immediate UI feedback (green ring, side panel button)
- Explored nodes always display a green ring (innermost ring) regardless of the color-by mode

## Graph Data

- Connections between nodes are derived from Obsidian's `metadataCache.resolvedLinks`
- Bidirectional links are deduplicated (A→B and B→A produce one edge)
- External nodes (linked but not in the Base filter) are only shown when the "Show linked notes outside the base" option is enabled
- Frontier nodes (unresolved link targets) are only shown when the "Show frontier nodes" option is enabled
- Node size is proportional to connection count by default (configurable to uniform)

## Node Visualization

- Node rings must not overlap — each ring type has a distinct radius slot (explored innermost, then confidence, hover glow, selected, focused, batch outermost)
- Highlight transitions use smooth fade-in/fade-out (exponential convergence) rather than instant opacity changes
- Non-connected nodes dim to 15% opacity when a node is hovered or search is active
- Node shape is determined by wiki role and is not configurable by the user

## Side Panel

- The "explored" badge pill is not shown in the side panel — the toggle button alone indicates explored state
- Internal links navigate in-panel when the target is a node in the current graph; otherwise they open in a new tab
- Middle-click on links always opens in a new tab
