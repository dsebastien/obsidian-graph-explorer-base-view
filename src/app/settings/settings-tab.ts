import { Notice, PluginSettingTab } from 'obsidian'
import type { App, SettingDefinitionItem } from 'obsidian'
import type { GraphExplorerPlugin } from '../plugin'
import { BUY_ME_A_COFFEE_BADGE_DATA_URL } from '../assets/buy-me-a-coffee'
import { NODE_SPACING_MAX, NODE_SPACING_MIN, NODE_SPACING_STEP } from '../types/graph-types'
import { renderSupportSection } from '../ui/support-links'

/** Dropdown option sets, shared between the definitions and validation. */
const COLOR_BY_OPTIONS: Record<string, string> = {
    explored: 'Explored status',
    confidence: 'Confidence level',
    wiki_role: 'Wiki role',
    created: 'Creation date',
    tags: 'First tag',
    maturity: 'Maturity level'
}
const SIZE_BY_OPTIONS: Record<string, string> = {
    connections: 'Connection count',
    uniform: 'Uniform size'
}
const EXPLORED_FILTER_OPTIONS: Record<string, string> = {
    all: 'All',
    explored: 'Explored only',
    unexplored: 'Unexplored only'
}

/**
 * Settings tab, declared rather than rendered (Obsidian 1.13+).
 *
 * `getSettingDefinitions()` REPLACES `display()`: when it returns a non-empty
 * array, `display()` is never called. There is no partial adoption — the whole
 * settings UI is declarative, or none of it. In exchange, Obsidian owns
 * navigation, focus and ARIA, and every declared `name`/`desc` is indexed by
 * the settings search.
 *
 * Rules that each cost a shipped bug somewhere in the plugin collection the
 * first time they were broken (see AGENTS.md "Declarative settings"):
 *
 * - A `render:` hook renders the ROW. Write into `setting.settingEl` only.
 * - `setControlValue` MUST reject on failure, and validate before writing.
 * - No `defaultValue` on the slider: it is the fallback for a resolver
 *   returning undefined, not for user input.
 * - Side effects run only AFTER the write lands — here the
 *   `graph-explorer:settings-changed` event lives inside the plugin's
 *   serialized `updateSettings`, after the commit.
 */
export class GraphExplorerSettingTab extends PluginSettingTab {
    plugin: GraphExplorerPlugin

    constructor(app: App, plugin: GraphExplorerPlugin) {
        super(app, plugin)
        this.plugin = plugin
    }

    override getSettingDefinitions(): SettingDefinitionItem[] {
        return [
            {
                name: 'Default explored property',
                desc: 'The frontmatter property name used to track explored status. Can be overridden per view.',
                control: {
                    type: 'text',
                    key: 'exploredPropertyName',
                    placeholder: 'explored'
                }
            },
            {
                name: 'Maturity property',
                desc: 'The frontmatter property name used to read article maturity level (e.g., "maturity").',
                control: { type: 'text', key: 'maturityPropertyName', placeholder: 'maturity' }
            },
            {
                name: 'Graduated notes property',
                desc: 'The frontmatter property name used to read the list of graduated permanent notes (e.g., "graduated_notes").',
                control: {
                    type: 'text',
                    key: 'graduatedNotesPropertyName',
                    placeholder: 'graduated_notes'
                }
            },
            {
                type: 'group',
                heading: 'Visualization defaults',
                items: [
                    {
                        name: 'Default color scheme',
                        desc: 'Default property used to color nodes in new views.',
                        control: {
                            type: 'dropdown',
                            key: 'defaultColorBy',
                            options: COLOR_BY_OPTIONS
                        }
                    },
                    {
                        name: 'Default size scheme',
                        desc: 'Default property used to size nodes in new views.',
                        control: {
                            type: 'dropdown',
                            key: 'defaultSizeBy',
                            options: SIZE_BY_OPTIONS
                        }
                    },
                    {
                        name: 'Show frontier nodes by default',
                        desc: 'Show unresolved links as ghost nodes by default in new views.',
                        control: { type: 'toggle', key: 'showFrontierDefault' }
                    },
                    {
                        name: 'Show external nodes by default',
                        desc: 'Show notes linked from outside the base by default in new views.',
                        control: { type: 'toggle', key: 'showExternalNodesDefault' }
                    },
                    {
                        name: 'Default explored filter',
                        desc: 'Default filter for explored status in new views.',
                        control: {
                            type: 'dropdown',
                            key: 'defaultExploredFilter',
                            options: EXPLORED_FILTER_OPTIONS
                        }
                    },
                    {
                        name: 'Default node spacing',
                        desc: 'Controls how far apart nodes spread. Higher values = more space between nodes. Can be overridden per view. (200–5000, default 1500)',
                        control: {
                            type: 'slider',
                            key: 'nodeSpacing',
                            min: NODE_SPACING_MIN,
                            max: NODE_SPACING_MAX,
                            step: NODE_SPACING_STEP
                        }
                    }
                ]
            },
            {
                name: 'Follow me on X',
                desc: 'Sébastien Dubois (@dSebastien)',
                searchable: false,
                // A CTA button, not a row `action:`. `action:` makes the WHOLE
                // row clickable and draws no button at all, so a link row that
                // used to have one silently loses it in the port.
                render: (setting): void => {
                    setting.addButton((button) => {
                        button
                            .setCta()
                            .setButtonText('Follow me on X')
                            .onClick(() => {
                                window.open('https://x.com/dSebastien')
                            })
                    })
                }
            },
            {
                type: 'group',
                // No heading: renderSupportSection draws its own.
                items: [
                    {
                        name: 'Support',
                        // Not a setting — keep it out of the settings search.
                        searchable: false,
                        render: (setting): void => {
                            setting.infoEl.remove() // the section draws its own headings
                            // `.setting-item` is a flex ROW. The support block
                            // is a stack of full-width rows, so without this it
                            // would lay heading, buttons and badge side by side.
                            setting.settingEl.addClass('ge-settings-embed')
                            renderSupportSection(setting.settingEl, (el) => {
                                this.renderBuyMeACoffeeBadge(el)
                            })
                        }
                    }
                ]
            }
        ]
    }

    /**
     * Reads the value behind a control `key`. Returning undefined/null makes
     * the framework fall back to the control's declared `defaultValue`.
     */
    override getControlValue(key: string): unknown {
        switch (key) {
            case 'exploredPropertyName':
                return this.plugin.settings.exploredPropertyName
            case 'maturityPropertyName':
                return this.plugin.settings.maturityPropertyName
            case 'graduatedNotesPropertyName':
                return this.plugin.settings.graduatedNotesPropertyName
            case 'defaultColorBy':
                return this.plugin.settings.defaultColorBy
            case 'defaultSizeBy':
                return this.plugin.settings.defaultSizeBy
            case 'showFrontierDefault':
                return this.plugin.settings.showFrontierDefault
            case 'showExternalNodesDefault':
                return this.plugin.settings.showExternalNodesDefault
            case 'defaultExploredFilter':
                return this.plugin.settings.defaultExploredFilter
            case 'nodeSpacing':
                return this.plugin.settings.nodeSpacing
            default:
                return undefined
        }
    }

    /**
     * Persists a control edit. Rejecting (not resolving) on failure is what
     * lets the framework roll the control back to the stored truth.
     *
     * The property-name fields fall back to their default when cleared —
     * exactly what the previous tab did with `value || 'default'`.
     */
    override async setControlValue(key: string, value: unknown): Promise<void> {
        switch (key) {
            case 'exploredPropertyName': {
                const next = this.expectString(key, value) || 'explored'
                await this.write((d) => {
                    d.exploredPropertyName = next
                })
                return
            }
            case 'maturityPropertyName': {
                const next = this.expectString(key, value) || 'maturity'
                await this.write((d) => {
                    d.maturityPropertyName = next
                })
                return
            }
            case 'graduatedNotesPropertyName': {
                const next = this.expectString(key, value) || 'graduated_notes'
                await this.write((d) => {
                    d.graduatedNotesPropertyName = next
                })
                return
            }
            case 'defaultColorBy': {
                const next = this.expectOption(key, value, COLOR_BY_OPTIONS)
                await this.write((d) => {
                    d.defaultColorBy = next
                })
                return
            }
            case 'defaultSizeBy': {
                const next = this.expectOption(key, value, SIZE_BY_OPTIONS)
                await this.write((d) => {
                    d.defaultSizeBy = next
                })
                return
            }
            case 'showFrontierDefault': {
                const next = this.expectBoolean(key, value)
                await this.write((d) => {
                    d.showFrontierDefault = next
                })
                return
            }
            case 'showExternalNodesDefault': {
                const next = this.expectBoolean(key, value)
                await this.write((d) => {
                    d.showExternalNodesDefault = next
                })
                return
            }
            case 'defaultExploredFilter': {
                const next = this.expectOption(key, value, EXPLORED_FILTER_OPTIONS)
                await this.write((d) => {
                    d.defaultExploredFilter = next
                })
                return
            }
            case 'nodeSpacing': {
                if (
                    typeof value !== 'number' ||
                    !Number.isFinite(value) ||
                    value < NODE_SPACING_MIN ||
                    value > NODE_SPACING_MAX
                ) {
                    throw new Error(
                        `Setting "${key}" expects a number between ${NODE_SPACING_MIN} and ${NODE_SPACING_MAX}.`
                    )
                }
                await this.write((d) => {
                    d.nodeSpacing = value
                })
                return
            }
            default:
                new Notice('Failed to save settings.')
                throw new Error(`Setting "${key}" does not address a known field.`)
        }
    }

    /** Shorthand for the plugin's serialized write path. */
    private write(mutator: Parameters<GraphExplorerPlugin['updateSettings']>[0]): Promise<void> {
        return this.plugin.updateSettings(mutator)
    }

    /** Rejects rather than coerces: a bad value must not reach the store. */
    private expectBoolean(key: string, value: unknown): boolean {
        if (typeof value !== 'boolean') {
            throw new Error(`Setting "${key}" expects a boolean.`)
        }
        return value
    }

    /** Rejects rather than coerces: a bad value must not reach the store. */
    private expectString(key: string, value: unknown): string {
        if (typeof value !== 'string') {
            throw new Error(`Setting "${key}" expects a string.`)
        }
        return value
    }

    /** Rejects any value that is not one of the dropdown's declared options. */
    private expectOption(key: string, value: unknown, options: Record<string, string>): string {
        if (typeof value !== 'string' || !(value in options)) {
            throw new Error(`Setting "${key}" expects one of the declared options.`)
        }
        return value
    }

    renderBuyMeACoffeeBadge(contentEl: HTMLElement | DocumentFragment, width = 175): void {
        const linkEl = contentEl.createEl('a', {
            href: 'https://www.buymeacoffee.com/dsebastien'
        })
        const imgEl = linkEl.createEl('img')
        imgEl.src = BUY_ME_A_COFFEE_BADGE_DATA_URL
        imgEl.alt = 'Buy me a coffee'
        imgEl.width = width
    }
}
