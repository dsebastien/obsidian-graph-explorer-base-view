import { describe, expect, test } from 'bun:test'
import { produce } from 'immer'
import { GraphExplorerPlugin } from '../plugin'
import { GraphExplorerSettingTab } from './settings-tab'
import { DEFAULT_SETTINGS } from '../types/plugin-settings.intf'
import { NODE_SPACING_MAX, NODE_SPACING_MIN, NODE_SPACING_STEP } from '../types/graph-types'

/**
 * Structural coverage for the declared settings: the write-path spec proves
 * writes behave, but nothing else would notice a silently dropped control,
 * option, or slider bound — removing one previously left every test green.
 */

interface Def {
    name?: string
    type?: string
    heading?: string
    items?: Def[]
    render?: unknown
    control?: {
        type: string
        key: string
        min?: number
        max?: number
        step?: number
        defaultValue?: unknown
        options?: Record<string, string>
    }
}

function createTab(): GraphExplorerSettingTab {
    const plugin = Object.create(GraphExplorerPlugin.prototype) as GraphExplorerPlugin
    ;(plugin as unknown as Record<string, unknown>)['settings'] = produce(
        DEFAULT_SETTINGS,
        () => DEFAULT_SETTINGS
    )
    const tab = Object.create(GraphExplorerSettingTab.prototype) as GraphExplorerSettingTab
    ;(tab as unknown as Record<string, unknown>)['plugin'] = plugin
    return tab
}

function flatten(defs: Def[]): Def[] {
    return defs.flatMap((d) => (d.items ? [d, ...flatten(d.items)] : [d]))
}

describe('setting definitions', () => {
    const defs = (
        createTab() as unknown as { getSettingDefinitions: () => Def[] }
    ).getSettingDefinitions()
    const all = flatten(defs)
    const controls = new Map(all.filter((d) => d.control).map((d) => [d.control!.key, d] as const))

    test('declares every control with its expected type', () => {
        expect([...controls.entries()].map(([key, d]) => [key, d.control!.type]).sort()).toEqual(
            [
                ['exploredPropertyName', 'text'],
                ['maturityPropertyName', 'text'],
                ['graduatedNotesPropertyName', 'text'],
                ['defaultColorBy', 'dropdown'],
                ['defaultSizeBy', 'dropdown'],
                ['showFrontierDefault', 'toggle'],
                ['showExternalNodesDefault', 'toggle'],
                ['defaultExploredFilter', 'dropdown'],
                ['nodeSpacing', 'slider']
            ].sort()
        )
    })

    test('dropdown options match the previous pane exactly (keys and labels)', () => {
        expect(controls.get('defaultColorBy')!.control!.options).toEqual({
            explored: 'Explored status',
            confidence: 'Confidence level',
            wiki_role: 'Wiki role',
            created: 'Creation date',
            tags: 'First tag',
            maturity: 'Maturity level'
        })
        expect(controls.get('defaultSizeBy')!.control!.options).toEqual({
            connections: 'Connection count',
            uniform: 'Uniform size'
        })
        expect(controls.get('defaultExploredFilter')!.control!.options).toEqual({
            all: 'All',
            explored: 'Explored only',
            unexplored: 'Unexplored only'
        })
    })

    test('the slider carries the old setLimits bounds and no defaultValue', () => {
        const slider = controls.get('nodeSpacing')!.control!
        expect(slider.min).toBe(NODE_SPACING_MIN)
        expect(slider.max).toBe(NODE_SPACING_MAX)
        expect(slider.step).toBe(NODE_SPACING_STEP)
        expect('defaultValue' in slider).toBe(false)
    })

    test('no control anywhere declares a defaultValue', () => {
        for (const [key, d] of controls) {
            expect('defaultValue' in d.control!, key).toBe(false)
        }
    })

    test('the follow CTA and support block survive as render rows', () => {
        expect(all.some((d) => d.name === 'Follow me on X' && d.render)).toBe(true)
        expect(all.some((d) => d.name === 'Support' && d.render)).toBe(true)
    })

    test('every declared control key answers through getControlValue', () => {
        const tab = createTab()
        for (const key of controls.keys()) {
            expect(tab.getControlValue(key), key).not.toBeUndefined()
        }
    })
})
