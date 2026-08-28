/**
 * Test setup file that mocks the 'obsidian' module.
 * The obsidian package is types-only and has no runtime code,
 * so we need to provide mock implementations for tests.
 */
import { mock } from 'bun:test'

// Mock the obsidian module (fire-and-forget, no need to await)
// force-graph reads `window` at module-load time, which does not exist under
// bun:test. Any spec that imports the plugin (settings-write.spec.ts) pulls it
// in transitively, so stub the module before anything can load it.
void mock.module('force-graph', () => ({
    default: (): Record<string, never> => ({})
}))

void mock.module('obsidian', () => ({
    Notice: class Notice {
        constructor(_message: string, _timeout?: number) {
            // No-op for tests
        }
    },
    // These are only used as types, but we provide empty implementations
    // in case they're ever accessed at runtime
    App: class App {},
    TFile: class TFile {},
    Plugin: class Plugin {},
    ItemView: class ItemView {},
    WorkspaceLeaf: class WorkspaceLeaf {},
    Component: class Component {},
    BasesView: class BasesView {},
    MarkdownRenderer: { render: async () => {} },
    PluginSettingTab: class PluginSettingTab {},
    Setting: class Setting {},
    MarkdownView: class MarkdownView {},
    TAbstractFile: class TAbstractFile {},
    TFolder: class TFolder {},
    AbstractInputSuggest: class AbstractInputSuggest {},
    SearchComponent: class SearchComponent {},
    debounce: (fn: (...args: unknown[]) => unknown) => fn,
    setIcon: () => {}
}))
