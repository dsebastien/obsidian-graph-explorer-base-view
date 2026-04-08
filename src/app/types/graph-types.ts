import type { NodeObject, LinkObject } from 'force-graph'

/** Confidence level from wiki articles */
export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'uncertain' | 'unknown'

/** Wiki role from wiki articles */
export type WikiRole = 'article' | 'index' | 'log' | 'source_summary' | 'unknown'

/** Maturity level from wiki articles */
export type MaturityLevel = 'stub' | 'draft' | 'substantial' | 'mature' | 'unknown'

/** Filter mode for explored status */
export type ExploredFilter = 'all' | 'explored' | 'unexplored'

/** Layout algorithm for the graph */
export type GraphLayout = 'force' | 'dag-td' | 'dag-lr' | 'dag-radialout'

/**
 * A node in the graph representing a vault note.
 */
export interface GraphNode extends NodeObject {
    /** Vault file path (unique identifier) */
    id: string
    /** Display name (file basename without extension) */
    name: string
    /** Whether the note has been explored */
    explored: boolean
    /** Number of connections to other nodes in the graph */
    connectionCount: number
    /** Whether this node is from outside the Base filter */
    external: boolean
    /** Confidence level (from frontmatter) */
    confidence: ConfidenceLevel
    /** Wiki role (from frontmatter) */
    wikiRole: WikiRole
    /** Maturity level (from frontmatter) */
    maturity: MaturityLevel
    /** Graduated permanent notes extracted from this article */
    graduatedNotes: string[]
    /** Creation timestamp in ms (from frontmatter or file stat) */
    created: number | null
    /** Tags on the note */
    tags: string[]
    /** Raw frontmatter properties for generic visualization */
    frontmatter: Record<string, unknown>
    /** Whether this is a frontier/red-link node (unresolved link target) */
    frontier: boolean
    /** Whether this node is batch-selected */
    batchSelected?: boolean
}

/**
 * A link/edge in the graph.
 */
export interface GraphLink extends LinkObject<GraphNode> {
    source: string
    target: string
    /** Wiki role of the source node, for edge styling */
    sourceRole?: WikiRole
    /** Whether this link points to a frontier node */
    toFrontier?: boolean
}

/**
 * The full graph dataset.
 */
export interface GraphData {
    nodes: GraphNode[]
    links: GraphLink[]
}

/**
 * Extended stats for the progress dashboard.
 */
export interface GraphStats {
    totalNodes: number
    totalLinks: number
    exploredCount: number
    unexploredCount: number
    confidenceDistribution: Record<ConfidenceLevel, number>
    roleDistribution: Record<WikiRole, number>
    maturityDistribution: Record<MaturityLevel, number>
    graduatedCount: number
    frontierCount: number
    coveragePercent: number
}

/**
 * A saved view preset configuration.
 */
export interface ViewPreset {
    key: string
    name: string
    description: string
    config: Record<string, unknown>
}

/** Built-in view presets */
export const VIEW_PRESETS: ViewPreset[] = [
    {
        key: 'wiki-explorer',
        name: 'LLM Wiki Explorer',
        description:
            'Quality review: colors show confidence (green=high, red=uncertain), includes frontier nodes and external links to reveal gaps',
        config: {
            colorBy: 'confidence',
            sizeBy: 'connections',
            showFrontier: true,
            showExternalNodes: true,
            exploredFilter: 'all',
            layout: 'force'
        }
    },
    {
        key: 'exploration-progress',
        name: 'Exploration Progress',
        description:
            'Reading tracker: green nodes are reviewed, gray are untouched — see what percentage of your vault you have explored',
        config: {
            colorBy: 'explored',
            sizeBy: 'connections',
            showFrontier: false,
            exploredFilter: 'all',
            layout: 'force'
        }
    },
    {
        key: 'role-overview',
        name: 'Role Overview',
        description:
            'Structure map: colors show note types (blue=article, purple=index, teal=log, yellow=source summary) — see how your wiki is organized',
        config: {
            colorBy: 'wiki_role',
            sizeBy: 'connections',
            showFrontier: false,
            layout: 'force'
        }
    },
    {
        key: 'maturity-pipeline',
        name: 'Maturity Pipeline',
        description:
            'Writing pipeline: colors show depth (green=mature, blue=substantial, yellow=draft, orange=stub) — find which articles need deepening',
        config: {
            colorBy: 'maturity',
            sizeBy: 'connections',
            showFrontier: false,
            exploredFilter: 'all',
            layout: 'force'
        }
    }
]
