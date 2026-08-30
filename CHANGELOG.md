# Changelog

All notable changes to this project will be documented in this file.

## [2.0.1](https://github.com/dsebastien/obsidian-graph-explorer-base-view/compare/2.0.0...2.0.1) (2026-08-30)

### Features

* **build:** make the rule floor check that it is still wired in ([93f498b](https://github.com/dsebastien/obsidian-graph-explorer-base-view/commit/93f498b6dbf090b8b93478e9569b4e0f7b59b20e))
* **build:** refuse commits that loosen the rules instead of fixing the finding ([ea1ebc9](https://github.com/dsebastien/obsidian-graph-explorer-base-view/commit/ea1ebc99f0e6287b35e5d08298ed4f0a1341644f))

### Bug Fixes

* **deps:** drop the dead resolutions block that contradicted overrides ([bc73312](https://github.com/dsebastien/obsidian-graph-explorer-base-view/commit/bc733128985e5f5620b1a38fcd23b64d67b902f2))

## [2.0.0](https://github.com/dsebastien/obsidian-graph-explorer-base-view/compare/1.5.0...2.0.0) (2026-08-29)

### ⚠ BREAKING CHANGES

* **plugin:** minAppVersion is now 1.13.0 (was 1.10.0). The settings pane
uses the declarative settings API introduced in Obsidian 1.13.

- getSettingDefinitions() replaces display(): 3 property-name text controls
  (falling back to their defaults when cleared, as before), 2 dropdowns
  validated against their declared option sets, 2 toggles, and the node
  spacing slider (bounds validated in setControlValue, no defaultValue),
  all indexed by the settings search. Follow button and support block are
  render: rows.
- updateSettings becomes the serialized persist-then-commit write path; the
  graph-explorer:settings-changed event now fires strictly AFTER the write
  lands, so views never re-read state a failed write rolled back.
  saveSettings is documented as load-time-only.
- The support block gets block layout via .setting-item.ge-settings-embed —
  placed OUTSIDE the stylesheet's @layer blocks, because unlayered app CSS
  beats layered CSS regardless of specificity.
- Tests: settings-guard.spec.ts + settings-write.spec.ts (10 behavioral
  tests: queue, rollback, event ordering, option/range rejection;
  mutation-checked against an optimistic commit, an unserialized chain, and
  a dropped event — each breaks tests). test-setup stubs force-graph, which
  reads window at module-load time under bun:test.
- README states the 1.13 requirement; AGENTS.md gains the
  declarative-settings section with the repo-specific notes.

### Features

* **plugin:** declare the settings tab (Obsidian 1.13 declarative settings) ([dae1306](https://github.com/dsebastien/obsidian-graph-explorer-base-view/commit/dae1306e9577cac56f713b9666591944ded65583))
* **plugin:** show what's new in a tab instead of a modal dialog ([3666c11](https://github.com/dsebastien/obsidian-graph-explorer-base-view/commit/3666c11db7285126a8f4ae2bdb7e557f284a3d9d))
* **plugin:** surface support CTAs everywhere users can see them ([638d99a](https://github.com/dsebastien/obsidian-graph-explorer-base-view/commit/638d99a8f3a42fc0d61f41aa1249197e2cca1144))

### Bug Fixes

* **build:** align with the catalog reviewer's archive, ruleset and audit ([b4506f2](https://github.com/dsebastien/obsidian-graph-explorer-base-view/commit/b4506f2006116ff7fdb84ad77dbf3ff90eb3a5c6))
* **plugin:** harden after adversarial review ([05d1b78](https://github.com/dsebastien/obsidian-graph-explorer-base-view/commit/05d1b787f1d0c6916f0f4ad5c15ac42245ab1353))
* **release:** dispatch the workflow at the pushed branch ([fa78e56](https://github.com/dsebastien/obsidian-graph-explorer-base-view/commit/fa78e569b46288833772edc69c8efdbf86299816))

## [1.5.0](https://github.com/dsebastien/obsidian-graph-explorer-base-view/compare/1.4.0...1.5.0) (2026-07-29)

### Features

* **plugin:** aggregate what's new dialogs across simultaneously updated plugins ([3739ab5](https://github.com/dsebastien/obsidian-graph-explorer-base-view/commit/3739ab5132eee337d935de8f2fef18ec40971d04))

## [1.4.0](https://github.com/dsebastien/obsidian-graph-explorer-base-view/compare/1.3.0...1.4.0) (2026-07-29)

### Features

* **plugin:** add Knowii community to the what's new dialog and harden it ([54bf63e](https://github.com/dsebastien/obsidian-graph-explorer-base-view/commit/54bf63e6c32b1f0e2e7e6ea88f76d42efb3ad34f))

## [1.3.0](https://github.com/dsebastien/obsidian-graph-explorer-base-view/compare/1.2.0...1.3.0) (2026-07-29)

### Bug Fixes

* **plugin:** move to obsidian 1.13.1 typings and expose node spacing as a Bases slider option ([7b703f3](https://github.com/dsebastien/obsidian-graph-explorer-base-view/commit/7b703f3791a3570d18dd8a504bb4d468659d8434)), closes [#2](https://github.com/dsebastien/obsidian-graph-explorer-base-view/issues/2)

## [1.2.0](https://github.com/dsebastien/obsidian-graph-explorer-base-view/compare/1.1.2...1.2.0) (2026-07-27)

### Features

* **plugin:** show a what's new dialog once after plugin updates ([2faa152](https://github.com/dsebastien/obsidian-graph-explorer-base-view/commit/2faa152e63f2a7662898ae1e1da3cc8ef294c32b))

## [1.1.2](https://github.com/dsebastien/obsidian-graph-explorer-base-view/compare/1.1.1...1.1.2) (2026-07-17)

## [1.1.1](https://github.com/dsebastien/obsidian-graph-explorer-base-view/compare/1.1.0...1.1.1) (2026-06-17)

## [1.1.0](https://github.com/dsebastien/obsidian-graph-explorer-base-view/compare/1.0.2...1.1.0) (2026-06-02)

### Features

* **plugin:** always show labels for index notes ([1c82168](https://github.com/dsebastien/obsidian-graph-explorer-base-view/commit/1c82168b2ef191c879cbca885165c0a901e5dd5a))

### Bug Fixes

* **plugin:** scope Tailwind CSS to avoid breaking other plugins ([da1afdb](https://github.com/dsebastien/obsidian-graph-explorer-base-view/commit/da1afdb6a7e488941a92b0dffe19566abcb3da7a)), closes [#1](https://github.com/dsebastien/obsidian-graph-explorer-base-view/issues/1)

### Performance Improvements

* **plugin:** reduce graph flicker during Obsidian indexing ([8787ab7](https://github.com/dsebastien/obsidian-graph-explorer-base-view/commit/8787ab728defdb848517391f7f63b4ac2802cb6f))

## [1.0.2](https://github.com/dsebastien/obsidian-graph-explorer-base-view/compare/1.0.1...1.0.2) (2026-05-14)

## [1.0.1](https://github.com/dsebastien/obsidian-graph-explorer-base-view/compare/1.0.0...1.0.1) (2026-05-13)

## [1.0.0](https://github.com/dsebastien/obsidian-graph-explorer-base-view/compare/0.6.0...1.0.0) (2026-05-13)

## [0.6.0](https://github.com/dsebastien/obsidian-graph-explorer-base-view/compare/0.5.0...0.6.0) (2026-04-10)

### Features

* **all:** added a minimap ([3b6624f](https://github.com/dsebastien/obsidian-graph-explorer-base-view/commit/3b6624f8e46408080fe34a0ba2882cb86f3e9f3a))

## [0.5.0](https://github.com/dsebastien/obsidian-graph-explorer-base-view/compare/0.4.0...0.5.0) (2026-04-08)

### Features

* **all:** enabled moving node and connected ones ([ef2c5c6](https://github.com/dsebastien/obsidian-graph-explorer-base-view/commit/ef2c5c6ded078b202a07942dc3226d8a7fb989c7))

## [0.4.0](https://github.com/dsebastien/obsidian-graph-explorer-base-view/compare/0.3.0...0.4.0) (2026-04-08)

### Features

* **all:** added maturity management ([16a2f4d](https://github.com/dsebastien/obsidian-graph-explorer-base-view/commit/16a2f4d9b0992a41e505b1fcd4698b64ec705da9))
* **all:** added support for changing node positions (mind palace). Updated user guide ([d1ec9d6](https://github.com/dsebastien/obsidian-graph-explorer-base-view/commit/d1ec9d6a3b798ee7c688a1e2ea424866b6283ada))
* **all:** improved colors ux ([09dc0b1](https://github.com/dsebastien/obsidian-graph-explorer-base-view/commit/09dc0b1f31a433e51d8df6e6a139bdc01ce6d4c1))
* **all:** improved graph options and added legend (prev commit) ([cdd32e4](https://github.com/dsebastien/obsidian-graph-explorer-base-view/commit/cdd32e465b3697c9ea7be51fdb35df5df523edc1))
* **all:** improved maturity dropdown styling ([7a700a4](https://github.com/dsebastien/obsidian-graph-explorer-base-view/commit/7a700a4e9fa05cfeb17957ec1ea622633c623de8))
* **all:** refactored settings ([58dba33](https://github.com/dsebastien/obsidian-graph-explorer-base-view/commit/58dba33bd5037dc2510d2ed4afcf744ed01cda81))

## [0.3.0](https://github.com/dsebastien/obsidian-graph-explorer-base-view/compare/0.2.0...0.3.0) (2026-04-07)

### Features

* **all:** improved graph view (selection vs explored rings) ([b4e545b](https://github.com/dsebastien/obsidian-graph-explorer-base-view/commit/b4e545b5c246792e91fe02b844a62a60e0a1bf1b))
* **all:** updated ([e483d60](https://github.com/dsebastien/obsidian-graph-explorer-base-view/commit/e483d60f419012f0bf783ee0510851db88bdac0c))

## [0.2.0](https://github.com/dsebastien/obsidian-graph-explorer-base-view/compare/0.1.0...0.2.0) (2026-04-07)

### Features

* **all:** added possibility to easily open the current note in the side panel into a new tab ([cdf2992](https://github.com/dsebastien/obsidian-graph-explorer-base-view/commit/cdf299268680a2fd5131253b0d7e7e15e7afc894))
* **all:** added size and text settings ([7809fad](https://github.com/dsebastien/obsidian-graph-explorer-base-view/commit/7809fad3644e2390b89c1348b2e8615c2e60b173))
* **all:** adjusted the nodes and text scales ([158a23f](https://github.com/dsebastien/obsidian-graph-explorer-base-view/commit/158a23f9a7271c163ad3c845201450b0f26cdce1))
* **all:** better layout of the graph ([c1db275](https://github.com/dsebastien/obsidian-graph-explorer-base-view/commit/c1db275c28c20bbdb67bcb829f60e156f8d19ad3))
* **all:** improve text ([d42adcf](https://github.com/dsebastien/obsidian-graph-explorer-base-view/commit/d42adcf64d3cabdd79e1170996f16a1f3f89b5e1))
* **all:** improved graph nodes spacing ([7dba588](https://github.com/dsebastien/obsidian-graph-explorer-base-view/commit/7dba58870af522412b9ec2795b7b10bae09ecb15))
* **all:** improved graph view ([ed29cf1](https://github.com/dsebastien/obsidian-graph-explorer-base-view/commit/ed29cf1e9cbf1dc75580a13733b8b5c3fdd080f7))
* **all:** improved the graph and panel features ([e95fd6c](https://github.com/dsebastien/obsidian-graph-explorer-base-view/commit/e95fd6c521e4dcf0f4183ee93f3a0b471256fafd))
* **all:** improved visual consistency of the graph controls ([16b84f1](https://github.com/dsebastien/obsidian-graph-explorer-base-view/commit/16b84f1bc6a9f122b97f654364b05a9ae9b2b677))

## 0.1.0 (2026-04-07)

### Features

* add frontmatter utilities for explored property ([2e4789f](https://github.com/dsebastien/obsidian-graph-explorer-base-view/commit/2e4789fa49170c25a56808d9f59ad98a3d64b973))
* add graph canvas component with force-graph rendering ([c82819b](https://github.com/dsebastien/obsidian-graph-explorer-base-view/commit/c82819b4b8bc83ec11a203d1d60ce91b4552b878))
* add graph controls and zoom controls components ([2815c6c](https://github.com/dsebastien/obsidian-graph-explorer-base-view/commit/2815c6cddf817baf9ea9a2dadd2abe62e6fdca26))
* add graph data builder to transform base entries into graph nodes/links ([d170e61](https://github.com/dsebastien/obsidian-graph-explorer-base-view/commit/d170e6128e601e3f1a8281c10b26f3eadd6cc6b9))
* add graph explorer BasesView implementation ([49e5482](https://github.com/dsebastien/obsidian-graph-explorer-base-view/commit/49e5482c517f9c47c7b8db69675f98a4099bd1f1))
* add graph explorer CSS styles ([7b4f3c1](https://github.com/dsebastien/obsidian-graph-explorer-base-view/commit/7b4f3c141cf0a922be881650c7df28be0d6fb83c))
* add graph explorer view constants and options ([8911434](https://github.com/dsebastien/obsidian-graph-explorer-base-view/commit/89114349fdbafc89788add4d2114169b487dd924))
* add graph side panel with embedded note rendering ([bde5661](https://github.com/dsebastien/obsidian-graph-explorer-base-view/commit/bde5661110ec1bd7a0f99674dfde3fb3a8533609))
* add graph type definitions and update plugin settings ([c804535](https://github.com/dsebastien/obsidian-graph-explorer-base-view/commit/c80453573cb5edd28c238ad3b9a4dabb699e0cd0))
* register graph explorer base view and update plugin ([c111099](https://github.com/dsebastien/obsidian-graph-explorer-base-view/commit/c1110992607d7edbeae39002b0bd640899d9863e))

### Bug Fixes

* address code review issues (search highlight, theme reactivity, view option sync, cleanup) ([f3294ad](https://github.com/dsebastien/obsidian-graph-explorer-base-view/commit/f3294adbf62c2d822dfbb064be309b8cc9686e9e))












