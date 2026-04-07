export interface PluginSettings {
    /**
     * Default frontmatter property name used to track explored status.
     * This is the global default; can be overridden per-view via view options.
     */
    exploredPropertyName: string
}

export const DEFAULT_SETTINGS: PluginSettings = {
    exploredPropertyName: 'explored'
}
