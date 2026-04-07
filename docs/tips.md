# Tips and best practices

## Common use cases

### Exploring a new knowledge base

1. Create a Base that matches all notes in a folder (or the whole vault)
2. Select the **Exploration Progress** preset
3. Work through unexplored notes one by one, marking each as explored
4. Use the **New** filter button to focus on what's left
5. Track your progress with the coverage bar

### Reviewing article quality

1. Use the **LLM Wiki Explorer** preset
2. Nodes are colored by confidence level — red and orange notes need attention
3. Enable frontier nodes to see which links point to notes that don't exist yet
4. Double-click nodes to open and edit them directly

### Understanding knowledge structure

1. Use the **Role Overview** preset
2. Index nodes (diamonds) show your tables of contents
3. Log nodes (squares) show activity records
4. Source summary nodes (hexagons) show ingested content
5. Article nodes (circles) are your core knowledge entries

### Batch exploration

1. Right-click nodes or use Shift+Enter to batch-select multiple notes
2. Use the **Toggle explored** button in the controls to flip them all at once
3. Useful for marking a group of related notes as reviewed

## Performance tips

- Use the Base query to narrow down to a relevant subset of notes rather than loading the entire vault
- Reduce node spacing if the graph feels too spread out
- Collapse the controls panel when you don't need it
- Frontier and external nodes add to the node count — disable them if performance is a concern

## Troubleshooting

### Graph is empty

- Verify your Base query matches at least one note
- Check that the view type is set to **Graph Explorer**
- Ensure the plugin is enabled in **Settings > Community plugins**

### Explored status not updating

- Check that the configured explored property name matches what's in your frontmatter
- The default property is `explored` — if you use a different name, set it in plugin settings or view options
- After toggling, the green ring should appear immediately around the node

### Nodes are all the same color

- Check the **Color nodes by** view option — it may be set to a property your notes don't have
- If coloring by tags and notes have no tags, nodes will use the default gray
- Try switching to **Explored status** coloring to verify the graph is working

### Side panel not showing content

- Frontier nodes (unresolved links) have no file — they show a notice instead of content
- External nodes must exist as files in the vault to render content
- If the panel is hidden, click a node to reopen it
