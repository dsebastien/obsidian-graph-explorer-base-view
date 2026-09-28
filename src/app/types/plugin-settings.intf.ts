export interface PluginSettings {
    /** Default frontmatter property name used to track explored status */
    exploredPropertyName: string
    /** Default property for node coloring */
    defaultColorBy: string
    /** Default property for node sizing */
    defaultSizeBy: string
    /** Whether to show frontier nodes by default */
    showFrontierDefault: boolean
    /** Whether to show external nodes by default */
    showExternalNodesDefault: boolean
    /** Default explored filter */
    defaultExploredFilter: string
    /** Default view preset key (empty = custom) */
    defaultPreset: string
    /** Node repulsion strength (higher = more spread out). Range 200-5000. */
    nodeSpacing: number
    /** Frontmatter property name used to read maturity level */
    maturityPropertyName: string
    /** Frontmatter property name used to read graduated notes list */
    graduatedNotesPropertyName: string
}

/**
 * A fresh default settings object, safe to hand to Immer.
 *
 * `produce` deep-freezes what it returns, including any subtree it shares
 * with its base. Producing from the shared DEFAULT_SETTINGS froze that
 * constant (nested values too) for the rest of the process, so any later code
 * or test touching it failed with "Attempted to assign to readonly
 * property". Produce from this instead, and keep it deep-fresh: build
 * nested arrays and objects as new values, never by spreading DEFAULT_SETTINGS.
 */
export function createDefaultSettings(): PluginSettings {
    return {
        exploredPropertyName: 'explored',
        defaultColorBy: 'explored',
        defaultSizeBy: 'connections',
        showFrontierDefault: false,
        showExternalNodesDefault: false,
        defaultExploredFilter: 'all',
        defaultPreset: '',
        nodeSpacing: 1500,
        maturityPropertyName: 'maturity',
        graduatedNotesPropertyName: 'graduated_notes'
    }
}

/** The defaults, for reading and comparing. Never produce from it. */
export const DEFAULT_SETTINGS: PluginSettings = createDefaultSettings()
