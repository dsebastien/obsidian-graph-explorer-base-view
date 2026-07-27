import type { BasesDropdownOption, BasesTextOption, BasesToggleOption, BasesAllOptions } from 'obsidian'
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
        } as BasesTextOption,
        {
            type: 'text',
            key: 'maturityProperty',
            displayName: 'Maturity property name',
            default: s.maturityPropertyName
        } as BasesTextOption,
        {
            type: 'text',
            key: 'graduatedNotesProperty',
            displayName: 'Graduated notes property name',
            default: s.graduatedNotesPropertyName
        } as BasesTextOption,
        {
            type: 'toggle',
            key: 'showExternalNodes',
            displayName: 'Show linked notes outside the base',
            default: s.showExternalNodesDefault
        } as BasesToggleOption,
        {
            type: 'toggle',
            key: 'showFrontier',
            displayName: 'Show frontier nodes (unresolved links)',
            default: s.showFrontierDefault
        } as BasesToggleOption,
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
        } as BasesDropdownOption,
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
        } as BasesDropdownOption,
        {
            type: 'dropdown',
            key: 'sizeBy',
            displayName: 'Size nodes by',
            default: s.defaultSizeBy,
            options: {
                connections: 'Connection count',
                uniform: 'Uniform size'
            }
        } as BasesDropdownOption,
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
        } as BasesDropdownOption
    ]
}
