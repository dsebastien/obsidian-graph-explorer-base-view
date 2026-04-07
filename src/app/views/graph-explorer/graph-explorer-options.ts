import type { DropdownOption, TextOption, ToggleOption, ViewOption } from 'obsidian'

export function getGraphExplorerViewOptions(): ViewOption[] {
    return [
        {
            type: 'text',
            key: 'exploredProperty',
            displayName: 'Explored property name',
            default: 'explored'
        } as TextOption,
        {
            type: 'toggle',
            key: 'showExternalNodes',
            displayName: 'Show linked notes outside the base',
            default: false
        } as ToggleOption,
        {
            type: 'toggle',
            key: 'showFrontier',
            displayName: 'Show frontier nodes (unresolved links)',
            default: false
        } as ToggleOption,
        {
            type: 'dropdown',
            key: 'exploredFilter',
            displayName: 'Filter by explored status',
            default: 'all',
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
            default: 'explored',
            options: {
                explored: 'Explored status',
                confidence: 'Confidence level',
                wiki_role: 'Wiki role',
                created: 'Creation date',
                tags: 'First tag'
            }
        } as DropdownOption,
        {
            type: 'dropdown',
            key: 'sizeBy',
            displayName: 'Size nodes by',
            default: 'connections',
            options: {
                connections: 'Connection count',
                uniform: 'Uniform size'
            }
        } as DropdownOption,
        {
            type: 'dropdown',
            key: 'layout',
            displayName: 'Layout algorithm',
            default: 'force',
            options: {
                'force': 'Force-directed',
                'dag-td': 'Hierarchical (top-down)',
                'dag-lr': 'Hierarchical (left-right)',
                'dag-radialout': 'Radial'
            }
        } as DropdownOption,
        {
            type: 'dropdown',
            key: 'preset',
            displayName: 'View preset',
            default: '',
            options: {
                '': 'Custom',
                'wiki-explorer': 'LLM Wiki Explorer',
                'exploration-progress': 'Exploration Progress',
                'role-overview': 'Role Overview'
            }
        } as DropdownOption
    ]
}
