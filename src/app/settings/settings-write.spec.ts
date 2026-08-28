import { describe, expect, test, mock } from 'bun:test'
import { produce } from 'immer'
import { GraphExplorerPlugin } from '../plugin'
import { GraphExplorerSettingTab } from './settings-tab'
import { DEFAULT_SETTINGS } from '../types/plugin-settings.intf'
import { NODE_SPACING_MAX } from '../types/graph-types'

/**
 * Behavioral coverage for the settings write path.
 *
 * `settings-guard.spec.ts` only scans source text, and nothing in CI renders a
 * settings pane. These tests exercise the properties no UI test can reach:
 * writes are serialized, memory is committed only after persistence succeeds,
 * a rejected value never reaches the store, and the settings-changed event
 * fires only after a successful commit.
 */

async function expectRejection(promise: Promise<unknown>, contains: string): Promise<void> {
    let caught: unknown
    await promise.catch((error: unknown) => {
        caught = error
    })
    expect(caught).toBeInstanceOf(Error)
    expect((caught as Error).message).toContain(contains)
}

interface Harness {
    plugin: GraphExplorerPlugin
    tab: GraphExplorerSettingTab
    saveData: ReturnType<typeof mock>
    dispatched: string[]
}

function createHarness(options?: { saveData?: () => Promise<void> }): Harness {
    const saveData = mock(async () => {
        if (options?.saveData) {
            await options.saveData()
        }
    })
    const dispatched: string[] = []
    const g = globalThis as unknown as Record<string, unknown>
    g['activeDocument'] = {
        dispatchEvent: (e: { type: string }) => {
            dispatched.push(e.type)
            return true
        }
    }
    if (!('CustomEvent' in g)) {
        g['CustomEvent'] = class CustomEventStub {
            type: string
            constructor(type: string) {
                this.type = type
            }
        }
    }

    const plugin = Object.create(GraphExplorerPlugin.prototype) as GraphExplorerPlugin
    const internals = plugin as unknown as Record<string, unknown>
    internals['settings'] = produce(DEFAULT_SETTINGS, () => DEFAULT_SETTINGS)
    internals['settingsWriteChain'] = Promise.resolve()
    internals['saveData'] = saveData

    const tab = Object.create(GraphExplorerSettingTab.prototype) as GraphExplorerSettingTab
    const tabInternals = tab as unknown as Record<string, unknown>
    tabInternals['plugin'] = plugin

    return { plugin, tab, saveData, dispatched }
}

describe('updateSettings', () => {
    test('commits to memory only after the write is persisted', async () => {
        let release = (): void => {}
        const gate = new Promise<void>((resolve) => {
            release = resolve
        })
        const { plugin, saveData, dispatched } = createHarness({ saveData: () => gate })

        const pending = plugin.updateSettings((draft) => {
            draft.showFrontierDefault = !DEFAULT_SETTINGS.showFrontierDefault
        })

        // Let the queued write start and reach its save await; a bare
        // synchronous assertion would pass even with the ordering reversed,
        // because the chain defers the work to a microtask.
        await Promise.resolve()
        await Promise.resolve()
        expect(saveData).toHaveBeenCalledTimes(1)
        expect(plugin.settings.showFrontierDefault).toBe(DEFAULT_SETTINGS.showFrontierDefault)
        expect(dispatched).toEqual([])

        release()
        await pending
        expect(plugin.settings.showFrontierDefault).toBe(!DEFAULT_SETTINGS.showFrontierDefault)
        expect(dispatched).toEqual(['graph-explorer:settings-changed'])
    })

    test('leaves memory untouched and fires no event when persistence fails', async () => {
        const { plugin, dispatched } = createHarness({
            saveData: () => Promise.reject(new Error('disk full'))
        })

        await expectRejection(
            plugin.updateSettings((draft) => {
                draft.nodeSpacing = 2000
            }),
            'disk full'
        )

        expect(plugin.settings.nodeSpacing).toBe(DEFAULT_SETTINGS.nodeSpacing)
        expect(dispatched).toEqual([])
    })

    test('overlapping writes do not drop each other', async () => {
        let releaseFirst = (): void => {}
        const first = new Promise<void>((resolve) => {
            releaseFirst = resolve
        })
        let call = 0
        const { plugin } = createHarness({
            saveData: () => {
                call += 1
                return call === 1 ? first : Promise.resolve()
            }
        })

        const a = plugin.updateSettings((draft) => {
            draft.maturityPropertyName = 'ripeness'
        })
        const b = plugin.updateSettings((draft) => {
            draft.showExternalNodesDefault = true
        })

        releaseFirst()
        await Promise.all([a, b])

        expect(plugin.settings.maturityPropertyName).toBe('ripeness')
        expect(plugin.settings.showExternalNodesDefault).toBe(true)
    })
})

describe('setControlValue', () => {
    test('cleared property names fall back to their defaults', async () => {
        // Exactly what the previous tab did with `value || 'default'`.
        const { tab, plugin } = createHarness()

        await tab.setControlValue('exploredPropertyName', '')
        await tab.setControlValue('maturityPropertyName', '')
        await tab.setControlValue('graduatedNotesPropertyName', '')

        expect(plugin.settings.exploredPropertyName).toBe('explored')
        expect(plugin.settings.maturityPropertyName).toBe('maturity')
        expect(plugin.settings.graduatedNotesPropertyName).toBe('graduated_notes')
    })

    test('rejects a dropdown value outside the declared options', async () => {
        const { tab, plugin, saveData } = createHarness()

        await expectRejection(tab.setControlValue('defaultColorBy', 'rainbow'), 'options')
        await expectRejection(tab.setControlValue('defaultExploredFilter', 'some'), 'options')
        expect(saveData).not.toHaveBeenCalled()
        expect(plugin.settings.defaultColorBy).toBe(DEFAULT_SETTINGS.defaultColorBy)
    })

    test('rejects an out-of-range or non-numeric node spacing', async () => {
        const { tab, plugin, saveData } = createHarness()

        await expectRejection(tab.setControlValue('nodeSpacing', NODE_SPACING_MAX + 1), 'between')
        await expectRejection(tab.setControlValue('nodeSpacing', Number.NaN), 'between')
        await expectRejection(tab.setControlValue('nodeSpacing', '1500'), 'between')
        expect(saveData).not.toHaveBeenCalled()
        expect(plugin.settings.nodeSpacing).toBe(DEFAULT_SETTINGS.nodeSpacing)
    })

    test('rejects a wrongly typed value and an unknown key without writing', async () => {
        const { tab, saveData } = createHarness()

        await expectRejection(tab.setControlValue('showFrontierDefault', 'yes'), 'boolean')
        await expectRejection(tab.setControlValue('nope', true), 'known field')
        expect(saveData).not.toHaveBeenCalled()
    })

    test('persists every scalar control', async () => {
        const { tab, plugin } = createHarness()

        await tab.setControlValue('exploredPropertyName', 'seen')
        await tab.setControlValue('defaultColorBy', 'maturity')
        await tab.setControlValue('defaultSizeBy', 'uniform')
        await tab.setControlValue('showFrontierDefault', true)
        await tab.setControlValue('showExternalNodesDefault', true)
        await tab.setControlValue('defaultExploredFilter', 'unexplored')
        await tab.setControlValue('nodeSpacing', 2400)

        expect(plugin.settings).toMatchObject({
            exploredPropertyName: 'seen',
            defaultColorBy: 'maturity',
            defaultSizeBy: 'uniform',
            showFrontierDefault: true,
            showExternalNodesDefault: true,
            defaultExploredFilter: 'unexplored',
            nodeSpacing: 2400
        })
    })

    test('getControlValue answers for every declared control key', () => {
        const { tab, plugin } = createHarness()

        for (const key of [
            'exploredPropertyName',
            'maturityPropertyName',
            'graduatedNotesPropertyName',
            'defaultColorBy',
            'defaultSizeBy',
            'showFrontierDefault',
            'showExternalNodesDefault',
            'defaultExploredFilter',
            'nodeSpacing'
        ]) {
            expect(tab.getControlValue(key)).toBe(
                (plugin.settings as unknown as Record<string, unknown>)[key]
            )
        }
        expect(tab.getControlValue('nope')).toBeUndefined()
    })
})
