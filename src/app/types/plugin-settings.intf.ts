export interface PluginSettings {
    /** Default frontmatter property name used to track explored status */
    exploredPropertyName: string
    /** Default property for node coloring */
    defaultColorBy: string
    /** Default property for node sizing */
    defaultSizeBy: string
    /** Default graph layout algorithm */
    defaultLayout: string
    /** Whether to show frontier nodes by default */
    showFrontierDefault: boolean
    /** Default view preset key (empty = custom) */
    defaultPreset: string
    /** Node repulsion strength (higher = more spread out). Range 200-5000. */
    nodeSpacing: number
}

export const DEFAULT_SETTINGS: PluginSettings = {
    exploredPropertyName: 'explored',
    defaultColorBy: 'explored',
    defaultSizeBy: 'connections',
    defaultLayout: 'force',
    showFrontierDefault: false,
    defaultPreset: '',
    nodeSpacing: 1500
}
