import type { DropdownOption, TextOption, ToggleOption, ViewOption } from 'obsidian'
import type { PluginSettings } from '../../types/plugin-settings.intf'
import { DEFAULT_SETTINGS } from '../../types/plugin-settings.intf'

export function getGraphExplorerViewOptions(settings?: PluginSettings): ViewOption[] {
    const s = settings ?? DEFAULT_SETTINGS
    return [
        {
            type: 'text',
            key: 'exploredProperty',
            displayName: 'Explored property name',
            default: s.exploredPropertyName
        } as TextOption,
        {
            type: 'text',
            key: 'maturityProperty',
            displayName: 'Maturity property name',
            default: s.maturityPropertyName
        } as TextOption,
        {
            type: 'text',
            key: 'graduatedNotesProperty',
            displayName: 'Graduated notes property name',
            default: s.graduatedNotesPropertyName
        } as TextOption,
        {
            type: 'toggle',
            key: 'showExternalNodes',
            displayName: 'Show linked notes outside the base',
            default: s.showExternalNodesDefault
        } as ToggleOption,
        {
            type: 'toggle',
            key: 'showFrontier',
            displayName: 'Show frontier nodes (unresolved links)',
            default: s.showFrontierDefault
        } as ToggleOption,
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
        } as DropdownOption,
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
        } as DropdownOption,
        {
            type: 'dropdown',
            key: 'sizeBy',
            displayName: 'Size nodes by',
            default: s.defaultSizeBy,
            options: {
                connections: 'Connection count',
                uniform: 'Uniform size'
            }
        } as DropdownOption,
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
        } as DropdownOption
    ]
}
