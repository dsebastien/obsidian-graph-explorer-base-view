import { describe, expect, test } from 'bun:test'
import type { BasesAllOptions, BasesOptions } from 'obsidian'
import { getGraphExplorerViewOptions } from './graph-explorer-options'
import { DEFAULT_SETTINGS } from '../../types/plugin-settings.intf'
import { NODE_SPACING_MAX, NODE_SPACING_MIN, NODE_SPACING_STEP } from '../../types/graph-types'

/** Narrows away option groups, which have no `key` */
function isOption(option: BasesAllOptions): option is BasesOptions {
    return 'key' in option
}

function getOptions(settings?: Parameters<typeof getGraphExplorerViewOptions>[0]): BasesOptions[] {
    return getGraphExplorerViewOptions(settings).filter(isOption)
}

describe('getGraphExplorerViewOptions', () => {
    test('only returns flat options, never groups', () => {
        const options = getGraphExplorerViewOptions()
        expect(getOptions().length).toBe(options.length)
    })

    test('exposes unique keys', () => {
        const keys = getOptions().map((option) => option.key)
        expect(new Set(keys).size).toBe(keys.length)
    })

    test('exposes node spacing as a slider bounded by the shared constants', () => {
        const spacing = getOptions().find((option) => option.key === 'nodeSpacing')
        expect(spacing).toBeDefined()
        expect(spacing).toMatchObject({
            type: 'slider',
            min: NODE_SPACING_MIN,
            max: NODE_SPACING_MAX,
            step: NODE_SPACING_STEP,
            default: DEFAULT_SETTINGS.nodeSpacing
        })
    })

    test('defaults come from the provided plugin settings', () => {
        const options = getOptions({
            ...DEFAULT_SETTINGS,
            exploredPropertyName: 'reviewed',
            nodeSpacing: 3000
        })
        expect(options.find((option) => option.key === 'exploredProperty')).toMatchObject({
            default: 'reviewed'
        })
        expect(options.find((option) => option.key === 'nodeSpacing')).toMatchObject({
            default: 3000
        })
    })
})
