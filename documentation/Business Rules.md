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

## Graph Data

- Connections between nodes are derived from Obsidian's `metadataCache.resolvedLinks`
- Bidirectional links are deduplicated (A->B and B->A produce one edge)
- External nodes (linked but not in the Base filter) are only shown when the "Show linked notes outside the base" option is enabled
- Node size is proportional to connection count (degree)
