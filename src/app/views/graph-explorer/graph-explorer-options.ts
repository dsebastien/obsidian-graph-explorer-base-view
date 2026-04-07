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
            type: 'dropdown',
            key: 'exploredFilter',
            displayName: 'Filter by explored status',
            default: 'all',
            options: {
                all: 'All',
                explored: 'Explored only',
                unexplored: 'Unexplored only'
            }
        } as DropdownOption
    ]
}
