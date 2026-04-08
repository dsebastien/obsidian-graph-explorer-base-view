export interface PluginSettings {
    /** Default frontmatter property name used to track explored status */
    exploredPropertyName: string
    /** Default property for node coloring */
    defaultColorBy: string
    /** Default property for node sizing */
    defaultSizeBy: string
    /** Whether to show frontier nodes by default */
    showFrontierDefault: boolean
    /** Default view preset key (empty = custom) */
    defaultPreset: string
    /** Node repulsion strength (higher = more spread out). Range 200-5000. */
    nodeSpacing: number
    /** Frontmatter property name used to read maturity level */
    maturityPropertyName: string
    /** Frontmatter property name used to read graduated notes list */
    graduatedNotesPropertyName: string
}

export const DEFAULT_SETTINGS: PluginSettings = {
    exploredPropertyName: 'explored',
    defaultColorBy: 'explored',
    defaultSizeBy: 'connections',
    showFrontierDefault: false,
    defaultPreset: '',
    nodeSpacing: 1500,
    maturityPropertyName: 'maturity',
    graduatedNotesPropertyName: 'graduated_notes'
}
