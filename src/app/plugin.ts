import { registerWhatsNewView } from './whats-new'
import { Plugin } from 'obsidian'
import { DEFAULT_SETTINGS } from './types/plugin-settings.intf'
import type { PluginSettings } from './types/plugin-settings.intf'
import { GraphExplorerSettingTab } from './settings/settings-tab'
import { GraphExplorerView } from './views/graph-explorer/graph-explorer-view'
import { getGraphExplorerViewOptions } from './views/graph-explorer/graph-explorer-options'
import { GRAPH_EXPLORER_VIEW_TYPE } from './views/graph-explorer/graph-explorer.constants'
import { clampNodeSpacing } from './types/graph-types'
import { log } from '../utils/log'
import { produce } from 'immer'
import type { Draft } from 'immer'

export class GraphExplorerPlugin extends Plugin {
    // 1.13.0 added `settings?: unknown` on Plugin; we narrow it to our concrete type
    override settings: PluginSettings = produce(DEFAULT_SETTINGS, () => DEFAULT_SETTINGS)

    override async onload(): Promise<void> {
        // Must run before anything can call saveData (fresh-install detection)
        registerWhatsNewView(this)
        log('Initializing', 'debug')
        await this.loadSettings()
        this.registerViews()
        this.addSettingTab(new GraphExplorerSettingTab(this.app, this))
    }

    override onunload(): void {
        log('Unloading', 'debug')
    }

    private registerViews(): void {
        const registered = this.registerBasesView(GRAPH_EXPLORER_VIEW_TYPE, {
            name: 'Graph Explorer',
            icon: 'git-fork',
            factory: (controller, containerEl) =>
                new GraphExplorerView(controller, containerEl, this),
            options: () => getGraphExplorerViewOptions(this.settings)
        })

        if (registered) {
            log('Graph Explorer view registered', 'debug')
        } else {
            log('Failed to register Graph Explorer view', 'warn')
        }
    }

    async loadSettings(): Promise<void> {
        log('Loading settings', 'debug')
        const loadedSettings = (await this.loadData()) as PluginSettings | null

        if (!loadedSettings) {
            log('Using default settings', 'debug')
            return
        }

        this.settings = produce(this.settings, (draft: Draft<PluginSettings>) => {
            if (typeof loadedSettings.exploredPropertyName === 'string') {
                draft.exploredPropertyName = loadedSettings.exploredPropertyName
            }
            if (typeof loadedSettings.defaultColorBy === 'string') {
                draft.defaultColorBy = loadedSettings.defaultColorBy
            }
            if (typeof loadedSettings.defaultSizeBy === 'string') {
                draft.defaultSizeBy = loadedSettings.defaultSizeBy
            }
            if (typeof loadedSettings.showFrontierDefault === 'boolean') {
                draft.showFrontierDefault = loadedSettings.showFrontierDefault
            }
            if (typeof loadedSettings.defaultPreset === 'string') {
                draft.defaultPreset = loadedSettings.defaultPreset
            }
            if (typeof loadedSettings.showExternalNodesDefault === 'boolean') {
                draft.showExternalNodesDefault = loadedSettings.showExternalNodesDefault
            }
            if (typeof loadedSettings.defaultExploredFilter === 'string') {
                draft.defaultExploredFilter = loadedSettings.defaultExploredFilter
            }
            if (typeof loadedSettings.nodeSpacing === 'number') {
                draft.nodeSpacing = clampNodeSpacing(loadedSettings.nodeSpacing)
            }
            if (typeof loadedSettings.maturityPropertyName === 'string') {
                draft.maturityPropertyName = loadedSettings.maturityPropertyName
            }
            if (typeof loadedSettings.graduatedNotesPropertyName === 'string') {
                draft.graduatedNotesPropertyName = loadedSettings.graduatedNotesPropertyName
            }
        })

        log('Settings loaded', 'debug', loadedSettings)
    }

    /** Serializes settings writes; see updateSettings. */
    private settingsWriteChain: Promise<void> = Promise.resolve()

    /**
     * Apply a mutation to the settings (via immer) and persist the result.
     * The single write path — the declarative settings tab routes every
     * control edit through here so persistence happens in exactly one place.
     */
    updateSettings(mutator: (draft: Draft<PluginSettings>) => void): Promise<void> {
        // Persist-then-commit: swap memory only after saveData() succeeds, so
        // a rejected write rolls the control back to the on-disk truth.
        // Serialized: writes queue and each mutation derives from the
        // previous COMMITTED state — without this, overlapping calls produce
        // from the same base across the save await and the second commit
        // silently drops the first edit.
        const run = async (): Promise<void> => {
            const next = produce(this.settings, mutator)
            await this.saveData(next)
            this.settings = next
            // Notify active views to re-read settings — only after the write
            // has landed, so a view never re-reads state that was rolled back.
            activeDocument.dispatchEvent(new CustomEvent('graph-explorer:settings-changed'))
        }
        const p = this.settingsWriteChain.then(run, run)
        this.settingsWriteChain = p.catch(() => {})
        return p
    }

    /**
     * Save the plugin settings.
     *
     * Load-time use only (persisting migrations applied by loadSettings).
     * Every user-driven write goes through updateSettings, which serializes
     * and persists before committing to memory.
     */
    async saveSettings(): Promise<void> {
        log('Saving settings', 'debug', this.settings)
        await this.saveData(this.settings)
        log('Settings saved', 'debug', this.settings)
        // Notify active views to re-read settings
        activeDocument.dispatchEvent(new CustomEvent('graph-explorer:settings-changed'))
    }
}
