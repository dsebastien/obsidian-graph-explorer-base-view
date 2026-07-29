import type { BasesAllOptions } from 'obsidian'
import { NODE_SPACING_MAX, NODE_SPACING_MIN, NODE_SPACING_STEP } from '../../types/graph-types'
import type { PluginSettings } from '../../types/plugin-settings.intf'
import { DEFAULT_SETTINGS } from '../../types/plugin-settings.intf'

export function getGraphExplorerViewOptions(settings?: PluginSettings): BasesAllOptions[] {
    const s = settings ?? DEFAULT_SETTINGS
    return [
        {
            type: 'text',
            key: 'exploredProperty',
            displayName: 'Explored property name',
            default: s.exploredPropertyName
        },
        {
            type: 'text',
            key: 'maturityProperty',
            displayName: 'Maturity property name',
            default: s.maturityPropertyName
        },
        {
            type: 'text',
            key: 'graduatedNotesProperty',
            displayName: 'Graduated notes property name',
            default: s.graduatedNotesPropertyName
        },
        {
            type: 'toggle',
            key: 'showExternalNodes',
            displayName: 'Show linked notes outside the base',
            default: s.showExternalNodesDefault
        },
        {
            type: 'toggle',
            key: 'showFrontier',
            displayName: 'Show frontier nodes (unresolved links)',
            default: s.showFrontierDefault
        },
        {
            type: 'dropdown',
            key: 'exploredFilter',
            displayName: 'Filter by explored status',
            default: s.defaultExploredFilter,
            options: {
                all: 'All',
                explored: 'Explored only',
                unexplored: 'Unexplored only'
            }
        },
        {
            type: 'dropdown',
            key: 'colorBy',
            displayName: 'Color nodes by',
            default: s.defaultColorBy,
            options: {
                explored: 'Explored status',
                confidence: 'Confidence level',
                wiki_role: 'Wiki role',
                created: 'Creation date',
                tags: 'First tag',
                maturity: 'Maturity level'
            }
        },
        {
            type: 'dropdown',
            key: 'sizeBy',
            displayName: 'Size nodes by',
            default: s.defaultSizeBy,
            options: {
                connections: 'Connection count',
                uniform: 'Uniform size'
            }
        },
        {
            type: 'slider',
            key: 'nodeSpacing',
            displayName: 'Node spacing',
            default: s.nodeSpacing,
            min: NODE_SPACING_MIN,
            max: NODE_SPACING_MAX,
            step: NODE_SPACING_STEP
        },
        {
            type: 'dropdown',
            key: 'preset',
            displayName: 'View preset',
            default: s.defaultPreset,
            options: {
                '': 'Custom',
                'wiki-explorer': 'Wiki Explorer — quality & gaps',
                'exploration-progress': 'Exploration — reviewed vs new',
                'role-overview': 'Roles — article types & structure',
                'maturity-pipeline': 'Maturity — writing depth pipeline'
            }
        }
    ]
}
