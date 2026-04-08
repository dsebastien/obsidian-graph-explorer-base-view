# Usage

## Getting started

1. Open or create an **Obsidian Base** in your vault
2. In the Base view selector, choose **Graph Explorer**
3. The graph renders all notes matched by the Base query
4. Click a node to select it and open the side panel

## Interacting with the graph

### Mouse

| Action            | Effect                                                                          |
| ----------------- | ------------------------------------------------------------------------------- |
| Click node        | Select node, open side panel                                                    |
| Double-click node | Open note in a new tab                                                          |
| Right-click node  | Context menu (open, explored toggle, set maturity, copy wikilink, batch select) |
| Drag node         | Reposition it in the graph (position is saved and restored on reopen)           |
| Shift+drag node   | Move the node and all its direct neighbors as a group                           |
| Scroll wheel      | Zoom in/out                                                                     |
| Click background  | Deselect node, close side panel                                                 |

### Keyboard

| Key             | Effect                                                |
| --------------- | ----------------------------------------------------- |
| Tab / Shift+Tab | Focus next / previous node                            |
| Arrow keys      | Navigate to an adjacent node in the pressed direction |
| Enter           | Select the focused node (opens side panel)            |
| Shift+Enter     | Add/remove focused node from batch selection          |
| Escape          | Clear focus, close side panel, clear batch selection  |

## Controls panel

The controls panel (top-left) provides:

- **Search** — real-time name search; matching nodes stay visible, others dim
- **Stats** — total nodes, links, explored count, frontier count
- **Progress bar** — exploration coverage percentage
- **Confidence distribution** — colored dots showing the breakdown of confidence levels
- **Maturity distribution** — colored dots showing the breakdown of maturity levels and graduated count
- **Sliders** — adjust node spacing (200–5000), node size (20–300%), and text size (20–300%)
- **Filter buttons** — show All, Explored only, or New (unexplored) only
- **Batch actions** — appears when nodes are batch-selected; toggle explored status or set maturity on all

Click the panel header to collapse/expand it.

## Side panel

When a node is selected, the right-side panel shows:

- **Title** (click to open note in a new tab)
- **Badges** for wiki role, confidence level, graduated notes count, tags, and external/frontier status
- **Action buttons**: toggle explored status, set maturity level (color-coded dropdown), copy markdown content
- **Full rendered note content** with working links

The maturity dropdown is color-coded to match the current level (green=mature, blue=substantial, yellow=draft, orange=stub). Changes are applied immediately to the note's frontmatter.

Internal links within the side panel navigate in-panel if the target is in the graph, or open in a new tab otherwise. Middle-click always opens in a new tab.

The panel is resizable by dragging its left border.

## Zoom controls and legend

The vertical button stack on the right provides:

- **+** Zoom in
- **−** Zoom out
- **Fit** Zoom to fit all nodes on screen
- **Reset** Reset view and zoom

Below the zoom controls, a **legend toggle button** (◣) shows/hides the color legend. The legend displays:

- **Color section** — what the node fill color means in the current color-by mode
- **Node style section** — green border = explored, hollow = unexplored, purple dot = graduated notes

## Node visualization

### Shapes

Nodes have different shapes based on their wiki role:

| Shape   | Wiki role         |
| ------- | ----------------- |
| Circle  | Article (default) |
| Diamond | Index             |
| Square  | Log               |
| Hexagon | Source summary    |

### Node style

Nodes use a combination of fill and border to convey explored status:

| Style                         | Meaning                                        |
| ----------------------------- | ---------------------------------------------- |
| Solid fill + green border     | Explored — note has been reviewed              |
| Hollow (faint fill + outline) | Unexplored — not yet reviewed                  |
| Purple dot (top-right)        | Has graduated permanent notes                  |
| Dashed outline (red, faint)   | Frontier — unresolved link, note doesn't exist |
| Dashed outline (gray, faint)  | External — linked but outside the Base filter  |

### Color modes

Nodes can be colored by different properties (configurable in view options):

| Mode             | Description                                                         |
| ---------------- | ------------------------------------------------------------------- |
| Explored status  | Green (explored) vs gray (unexplored)                               |
| Confidence level | Green (high), yellow (medium), orange (low), red (uncertain)        |
| Maturity level   | Green (mature), blue (substantial), yellow (draft), orange (stub)   |
| Wiki role        | Blue (article), purple (index), teal (log), yellow (source summary) |
| Creation date    | Green (recent) to gray (older)                                      |
| First tag        | Cycling color palette                                               |
| Custom property  | Any frontmatter property, auto-colored                              |

### Size modes

| Mode             | Description                            |
| ---------------- | -------------------------------------- |
| Connection count | Larger nodes have more links (default) |
| Uniform          | All nodes the same size                |

## Node position persistence

When you drag a node to reposition it, the position is saved in the view's configuration. Reopening the view restores all dragged nodes to their saved positions. Nodes you haven't dragged are positioned by the force simulation as usual.

**Shift+drag** moves a node and all its direct neighbors as a group, maintaining their relative positions. On release, the main node stays pinned. Neighbors that were already pinned update their saved positions; unpinned neighbors are released back to the force simulation.

Saved positions are keyed by file path. If a note is renamed, moved, or deleted, its stale position entry is automatically cleaned up on the next graph load.

## Frontier nodes

Frontier nodes represent unresolved links — references to notes that don't exist yet. They appear as dashed, semi-transparent red nodes. Enable them via the view option **Show frontier nodes (unresolved links)**.

## External nodes

External nodes are notes linked from within the Base but not matching the Base query themselves. Enable them via **Show linked notes outside the base**. They appear with a dashed outline in muted colors.

## Batch operations

1. Right-click a node and select **Add to batch selection**, or press **Shift+Enter** on a focused node
2. Repeat to select multiple nodes
3. Use the **Toggle explored** button to flip all their explored statuses at once
4. Use the **Set maturity** dropdown to assign a maturity level to all selected nodes
5. Press **Escape** to clear the batch selection

## Exploration tracking

The plugin tracks which notes you've explored via a frontmatter property (default: `explored`). Notes without this property are considered unexplored.

- Toggle a note's explored status via the side panel button or context menu
- The progress bar and stats update in real-time
- Filter the graph to show only explored or unexplored notes
- Explored nodes display a green border in the graph; unexplored nodes appear hollow

## Maturity tracking

The plugin reads and writes a maturity level frontmatter property (default: `maturity`). Set maturity via:

- **Side panel dropdown** — color-coded selector in the action buttons row
- **Context menu** — right-click a node and pick a maturity level
- **Batch actions** — set maturity on all selected nodes at once

Maturity levels: `stub`, `draft`, `substantial`, `mature`. Setting "No maturity" removes the property from frontmatter.
