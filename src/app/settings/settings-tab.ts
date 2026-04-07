import { App, PluginSettingTab, Setting } from 'obsidian'
import type { GraphExplorerPlugin } from '../plugin'

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
            .setName('Default layout')
            .setDesc('Default graph layout algorithm.')
            .addDropdown((dropdown) =>
                dropdown
                    .addOption('force', 'Force-directed')
                    .addOption('dag-td', 'Hierarchical (top-down)')
                    .addOption('dag-lr', 'Hierarchical (left-right)')
                    .addOption('dag-radialout', 'Radial')
                    .setValue(this.plugin.settings.defaultLayout)
                    .onChange(async (value) => {
                        this.plugin.settings = {
                            ...this.plugin.settings,
                            defaultLayout: value
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
        imgEl.src =
            'https://github.com/dsebastien/obsidian-plugin-template/blob/main/src/assets/buy-me-a-coffee.png?raw=true'
        imgEl.alt = 'Buy me a coffee'
        imgEl.width = width
    }
}
