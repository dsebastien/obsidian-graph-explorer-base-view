# Release Notes

## 2.0.1 (2026-08-30)

### Features

- **build:** make the rule floor check that it is still wired in
- **build:** refuse commits that loosen the rules instead of fixing the finding

### Bug Fixes

- **deps:** drop the dead resolutions block that contradicted overrides

## 2.0.0 (2026-08-29)

### ⚠ BREAKING CHANGES

- **plugin:** minAppVersion is now 1.13.0 (was 1.10.0). The settings pane
  uses the declarative settings API introduced in Obsidian 1.13.

* getSettingDefinitions() replaces display(): 3 property-name text controls
  (falling back to their defaults when cleared, as before), 2 dropdowns
  validated against their declared option sets, 2 toggles, and the node
  spacing slider (bounds validated in setControlValue, no defaultValue),
  all indexed by the settings search. Follow button and support block are
  render: rows.
* updateSettings becomes the serialized persist-then-commit write path; the
  graph-explorer:settings-changed event now fires strictly AFTER the write
  lands, so views never re-read state a failed write rolled back.
  saveSettings is documented as load-time-only.
* The support block gets block layout via .setting-item.ge-settings-embed —
  placed OUTSIDE the stylesheet's @layer blocks, because unlayered app CSS
  beats layered CSS regardless of specificity.
* Tests: settings-guard.spec.ts + settings-write.spec.ts (10 behavioral
  tests: queue, rollback, event ordering, option/range rejection;
  mutation-checked against an optimistic commit, an unserialized chain, and
  a dropped event — each breaks tests). test-setup stubs force-graph, which
  reads window at module-load time under bun:test.
* README states the 1.13 requirement; AGENTS.md gains the
  declarative-settings section with the repo-specific notes.

### Features

- **plugin:** declare the settings tab (Obsidian 1.13 declarative settings)
- **plugin:** show what's new in a tab instead of a modal dialog
- **plugin:** surface support CTAs everywhere users can see them

### Bug Fixes

- **build:** align with the catalog reviewer's archive, ruleset and audit
- **plugin:** harden after adversarial review
- **release:** dispatch the workflow at the pushed branch

## 1.5.0 (2026-07-29)

### Features

- **plugin:** aggregate what's new dialogs across simultaneously updated plugins

## 1.4.0 (2026-07-29)

### Features

- **plugin:** add Knowii community to the what's new dialog and harden it

## 1.3.0 (2026-07-29)

### Bug Fixes

- **plugin:** move to obsidian 1.13.1 typings and expose node spacing as a Bases slider option

## 1.2.0 (2026-07-27)

### Features

- **plugin:** show a what's new dialog once after plugin updates

## 1.1.2 (2026-07-17)

## 1.1.1 (2026-06-17)

## 1.1.0 (2026-06-02)

### Features

- **plugin:** always show labels for index notes

### Bug Fixes

- **plugin:** scope Tailwind CSS to avoid breaking other plugins

### Performance Improvements

- **plugin:** reduce graph flicker during Obsidian indexing

## 1.0.2 (2026-05-14)

## 1.0.1 (2026-05-13)

## 1.0.0 (2026-05-13)

## 0.6.0 (2026-04-10)

### Features

- **all:** added a minimap

## 0.5.0 (2026-04-08)

### Features

- **all:** enabled moving node and connected ones

## 0.4.0 (2026-04-08)

### Features

- **all:** added maturity management
- **all:** added support for changing node positions (mind palace). Updated user guide
- **all:** improved colors ux
- **all:** improved graph options and added legend (prev commit)
- **all:** improved maturity dropdown styling
- **all:** refactored settings

## 0.3.0 (2026-04-07)

### Features

- **all:** improved graph view (selection vs explored rings)
- **all:** updated

## 0.2.0 (2026-04-07)

### Features

- **all:** added possibility to easily open the current note in the side panel into a new tab
- **all:** added size and text settings
- **all:** adjusted the nodes and text scales
- **all:** better layout of the graph
- **all:** improve text
- **all:** improved graph nodes spacing
- **all:** improved graph view
- **all:** improved the graph and panel features
- **all:** improved visual consistency of the graph controls

## 0.1.0 (2026-04-07)

### Features

- add frontmatter utilities for explored property
- add graph canvas component with force-graph rendering
- add graph controls and zoom controls components
- add graph data builder to transform base entries into graph nodes/links
- add graph explorer BasesView implementation
- add graph explorer CSS styles
- add graph explorer view constants and options
- add graph side panel with embedded note rendering
- add graph type definitions and update plugin settings
- register graph explorer base view and update plugin

### Bug Fixes

- address code review issues (search highlight, theme reactivity, view option sync, cleanup)
