import type { NodeObject, LinkObject } from 'force-graph'

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
    /** Whether this node is from outside the Base filter (an "external" linked note) */
    external: boolean
}

/**
 * A link/edge in the graph representing a wiki-link between two notes.
 */
export interface GraphLink extends LinkObject<GraphNode> {
    source: string
    target: string
}

/**
 * The full graph dataset ready for force-graph rendering.
 */
export interface GraphData {
    nodes: GraphNode[]
    links: GraphLink[]
}

/**
 * Filter mode for explored status.
 */
export type ExploredFilter = 'all' | 'explored' | 'unexplored'
