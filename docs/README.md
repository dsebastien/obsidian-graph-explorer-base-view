---
title: Overview
nav_order: 1
permalink: /
---

# Graph Explorer Base View

An Obsidian plugin that renders notes from an [Obsidian Base](https://obsidian.md/bases) as an interactive force-directed graph. Visualize relationships between notes, track exploration progress, and navigate your knowledge base through an intuitive graph interface.

## Key features

- **Interactive force-directed graph** with drag, pan, zoom, and smooth animations
- **Exploration tracking** via frontmatter property, with progress bar and coverage stats
- **Rich node visualization** with color, size, and shape driven by note metadata (explored status, confidence, wiki role, tags, creation date, or any frontmatter property)
- **Side panel** showing full rendered note content with interactive wikilinks
- **Search and filter** by name, explored status, and more
- **Keyboard navigation** for accessibility (Tab, Arrow keys, Enter, Escape)
- **Batch operations** to toggle explored status on multiple notes at once
- **Frontier nodes** showing unresolved links (notes that don't exist yet)
- **Context menu** with quick actions (open, mark explored, copy wikilink, batch select)
- **View presets** for common workflows (LLM Wiki Explorer, Exploration Progress, Role Overview)

## Installation

### Community plugins (recommended)

1. In Obsidian, go to **Settings → Community plugins**.
2. Disable **Restricted mode** if it's enabled.
3. Select **Browse**, search for **Graph Explorer Base View**, install it, then enable it.

You can also browse the catalog on the [Obsidian Community](https://community.obsidian.md/) website.

### Manual installation

If the plugin isn't listed in the community catalog yet (or you want a specific version):

1. Download `main.js`, `manifest.json`, and `styles.css` from the [latest release](https://github.com/dsebastien/obsidian-graph-explorer-base-view/releases).
2. Copy them into `<Vault>/.obsidian/plugins/graph-explorer-base-view/`.
3. Reload Obsidian and enable **Graph Explorer Base View** in **Settings → Community plugins**.

### BRAT (bleeding edge)

[BRAT](https://github.com/TfTHacker/obsidian42-brat) (Beta Reviewers Auto-update Tool) installs plugins straight from a GitHub repo and keeps them updated automatically. Use this if you want the latest commits — **things might break**.

1. Install **Obsidian42 - BRAT** from **Settings → Community plugins → Browse** and enable it.
2. Run **BRAT: Add a beta plugin for testing** from the command palette.
3. Paste `https://github.com/dsebastien/obsidian-graph-explorer-base-view`.
4. Select the latest version and confirm.
5. Enable **Graph Explorer Base View** in **Settings → Community plugins**.

## Quick start

1. Install the plugin (see [Installation](#installation) above).
2. Create a new **Base** in your vault (or open an existing one).
3. Select **Graph Explorer** as the view type.
4. Your notes appear as an interactive graph — click any node to see its content in the side panel.

## About

Created by [Sébastien Dubois](https://dsebastien.net).

- [Buy me a coffee](https://www.buymeacoffee.com/dsebastien)
- [Report issues](https://github.com/dsebastien/obsidian-graph-explorer-base-view/issues)
