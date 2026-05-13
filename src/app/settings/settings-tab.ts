import { App, PluginSettingTab, Setting } from 'obsidian'
import type { GraphExplorerPlugin } from '../plugin'
import { BUY_ME_A_COFFEE_BADGE_DATA_URL } from '../assets/buy-me-a-coffee'

export class GraphExplorerSettingTab extends PluginSettingTab {
    plugin: GraphExplorerPlugin

    constructor(app: App, plugin: GraphExplorerPlugin) {
        super(app, plugin)
        this.plugin = plugin
    }

    display(): void {
        const { containerEl } = this
        containerEl.empty()

        // ── Explored property ─────────────────────────────────

        new Setting(containerEl)
            .setName('Default explored property')
            .setDesc(
                'The frontmatter property name used to track explored status. Can be overridden per view.'
            )
            .addText((text) =>
                text
                    .setPlaceholder('explored')
                    .setValue(this.plugin.settings.exploredPropertyName)
                    .onChange(async (value) => {
                        this.plugin.settings = {
                            ...this.plugin.settings,
                            exploredPropertyName: value || 'explored'
                        }
                        await this.plugin.saveSettings()
                    })
            )

        new Setting(containerEl)
            .setName('Maturity property')
            .setDesc(
                'The frontmatter property name used to read article maturity level (e.g., "maturity").'
            )
            .addText((text) =>
                text
                    .setPlaceholder('maturity')
                    .setValue(this.plugin.settings.maturityPropertyName)
                    .onChange(async (value) => {
                        this.plugin.settings = {
                            ...this.plugin.settings,
                            maturityPropertyName: value || 'maturity'
                        }
                        await this.plugin.saveSettings()
                    })
            )

        new Setting(containerEl)
            .setName('Graduated notes property')
            .setDesc(
                'The frontmatter property name used to read the list of graduated permanent notes (e.g., "graduated_notes").'
            )
            .addText((text) =>
                text
                    .setPlaceholder('graduated_notes')
                    .setValue(this.plugin.settings.graduatedNotesPropertyName)
                    .onChange(async (value) => {
                        this.plugin.settings = {
                            ...this.plugin.settings,
                            graduatedNotesPropertyName: value || 'graduated_notes'
                        }
                        await this.plugin.saveSettings()
                    })
            )

        // ── Visualization defaults ────────────────────────────

        new Setting(containerEl).setName('Visualization defaults').setHeading()

        new Setting(containerEl)
            .setName('Default color scheme')
            .setDesc('Default property used to color nodes in new views.')
            .addDropdown((dropdown) =>
                dropdown
                    .addOption('explored', 'Explored status')
                    .addOption('confidence', 'Confidence level')
                    .addOption('wiki_role', 'Wiki role')
                    .addOption('created', 'Creation date')
                    .addOption('tags', 'First tag')
                    .addOption('maturity', 'Maturity level')
                    .setValue(this.plugin.settings.defaultColorBy)
                    .onChange(async (value) => {
                        this.plugin.settings = {
                            ...this.plugin.settings,
                            defaultColorBy: value
                        }
                        await this.plugin.saveSettings()
                    })
            )

        new Setting(containerEl)
            .setName('Default size scheme')
            .setDesc('Default property used to size nodes in new views.')
            .addDropdown((dropdown) =>
                dropdown
                    .addOption('connections', 'Connection count')
                    .addOption('uniform', 'Uniform size')
                    .setValue(this.plugin.settings.defaultSizeBy)
                    .onChange(async (value) => {
                        this.plugin.settings = {
                            ...this.plugin.settings,
                            defaultSizeBy: value
                        }
                        await this.plugin.saveSettings()
                    })
            )

        new Setting(containerEl)
            .setName('Show frontier nodes by default')
            .setDesc('Show unresolved links as ghost nodes by default in new views.')
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.showFrontierDefault)
                    .onChange(async (value) => {
                        this.plugin.settings = {
                            ...this.plugin.settings,
                            showFrontierDefault: value
                        }
                        await this.plugin.saveSettings()
                    })
            )

        new Setting(containerEl)
            .setName('Show external nodes by default')
            .setDesc('Show notes linked from outside the base by default in new views.')
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.showExternalNodesDefault)
                    .onChange(async (value) => {
                        this.plugin.settings = {
                            ...this.plugin.settings,
                            showExternalNodesDefault: value
                        }
                        await this.plugin.saveSettings()
                    })
            )

        new Setting(containerEl)
            .setName('Default explored filter')
            .setDesc('Default filter for explored status in new views.')
            .addDropdown((dropdown) =>
                dropdown
                    .addOption('all', 'All')
                    .addOption('explored', 'Explored only')
                    .addOption('unexplored', 'Unexplored only')
                    .setValue(this.plugin.settings.defaultExploredFilter)
                    .onChange(async (value) => {
                        this.plugin.settings = {
                            ...this.plugin.settings,
                            defaultExploredFilter: value
                        }
                        await this.plugin.saveSettings()
                    })
            )

        new Setting(containerEl)
            .setName('Node spacing')
            .setDesc(
                'Controls how far apart nodes spread. Higher values = more space between nodes. (200–5000, default 1500)'
            )
            .addSlider((slider) =>
                slider
                    .setLimits(200, 5000, 100)
                    .setValue(this.plugin.settings.nodeSpacing)
                    .setDynamicTooltip()
                    .onChange(async (value) => {
                        this.plugin.settings = {
                            ...this.plugin.settings,
                            nodeSpacing: value
                        }
                        await this.plugin.saveSettings()
                    })
            )

        // ── Social ────────────────────────────────────────────

        this.renderFollowButton(containerEl)
        this.renderSupportHeader(containerEl)
    }

    renderFollowButton(containerEl: HTMLElement): void {
        new Setting(containerEl)
            .setName('Follow me on X')
            .setDesc('S\u00e9bastien Dubois (@dSebastien)')
            .addButton((button) => {
                button.setCta()
                button.setButtonText('Follow me on X').onClick(() => {
                    window.open('https://x.com/dSebastien')
                })
            })
    }

    renderSupportHeader(containerEl: HTMLElement): void {
        new Setting(containerEl).setName('Support').setHeading()

        const supportDesc = new DocumentFragment()
        supportDesc.createDiv({
            text: 'Buy me a coffee to support the development of this plugin'
        })

        new Setting(containerEl).setDesc(supportDesc)

        this.renderBuyMeACoffeeBadge(containerEl)
        const spacing = containerEl.createDiv()
        spacing.classList.add('support-header-margin')
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
