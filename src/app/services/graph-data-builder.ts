import type { BasesEntry, MetadataCache, CachedMetadata } from 'obsidian'
import type {
    GraphData,
    GraphNode,
    GraphLink,
    ExploredFilter,
    WikiRole
} from '../types/graph-types'
import {
    isNoteExplored,
    getNoteConfidence,
    getNoteWikiRole,
    getNoteMaturity,
    getNoteGraduatedNotes,
    getNoteTags,
    getNoteFrontmatter
} from '../utils/frontmatter-utils'

/**
 * Build graph data from Base entries and the vault's resolved links.
 * Extracts confidence, wiki_role, tags, frontmatter, and optionally
 * builds frontier nodes from unresolved links.
 */
export function buildGraphData(
    entries: BasesEntry[],
    metadataCache: MetadataCache,
    exploredProperty: string,
    showExternal: boolean,
    exploredFilter: ExploredFilter,
    showFrontier: boolean,
    maturityProperty = 'maturity',
    graduatedNotesProperty = 'graduated_notes'
): GraphData {
    const entryPaths = new Set<string>(entries.map((e) => e.file.path))
    const entryMap = new Map<string, BasesEntry>(entries.map((e) => [e.file.path, e]))

    // Build nodes from entries with all metadata
    let nodes: GraphNode[] = entries.map((entry) => {
        const metadata = metadataCache.getFileCache(entry.file)
        return {
            id: entry.file.path,
            name: entry.file.basename,
            explored: isNoteExplored(metadata, exploredProperty),
            connectionCount: 0,
            external: false,
            confidence: getNoteConfidence(metadata),
            wikiRole: getNoteWikiRole(metadata),
            maturity: getNoteMaturity(metadata, maturityProperty),
            graduatedNotes: getNoteGraduatedNotes(metadata, graduatedNotesProperty),
            created: getCreatedTimestamp(entry, metadata),
            tags: getNoteTags(metadata),
            frontmatter: getNoteFrontmatter(metadata),
            frontier: false
        }
    })

    // Apply explored filter
    if (exploredFilter === 'explored') {
        nodes = nodes.filter((n) => n.explored)
    } else if (exploredFilter === 'unexplored') {
        nodes = nodes.filter((n) => !n.explored)
    }

    const filteredPaths = new Set<string>(nodes.map((n) => n.id))
    const nodeRoleMap = new Map<string, WikiRole>(nodes.map((n) => [n.id, n.wikiRole]))

    // Build links from resolvedLinks
    const links: GraphLink[] = []
    const seenLinks = new Set<string>()
    const externalNodes = new Map<string, GraphNode>()

    for (const sourcePath of filteredPaths) {
        const targets = metadataCache.resolvedLinks[sourcePath]
        if (!targets) continue
        const sourceRole = nodeRoleMap.get(sourcePath) ?? 'unknown'

        for (const targetPath of Object.keys(targets)) {
            const targetInFiltered = filteredPaths.has(targetPath)
            const targetInEntries = entryPaths.has(targetPath)

            if (targetInFiltered) {
                const canonicalKey = [sourcePath, targetPath].sort().join('|')
                if (!seenLinks.has(canonicalKey)) {
                    seenLinks.add(canonicalKey)
                    links.push({ source: sourcePath, target: targetPath, sourceRole })
                }
            } else if (showExternal && !targetInEntries) {
                const canonicalKey = [sourcePath, targetPath].sort().join('|')
                if (!seenLinks.has(canonicalKey)) {
                    seenLinks.add(canonicalKey)
                    links.push({ source: sourcePath, target: targetPath, sourceRole })
                }
                if (!externalNodes.has(targetPath)) {
                    const basename = targetPath.replace(/\.md$/, '').split('/').pop() ?? targetPath
                    externalNodes.set(targetPath, {
                        id: targetPath,
                        name: basename,
                        explored: false,
                        connectionCount: 0,
                        external: true,
                        confidence: 'unknown',
                        wikiRole: 'unknown',
                        maturity: 'unknown',
                        graduatedNotes: [],
                        created: null,
                        tags: [],
                        frontmatter: {},
                        frontier: false
                    })
                }
            } else if (showExternal && targetInEntries && !targetInFiltered) {
                const canonicalKey = [sourcePath, targetPath].sort().join('|')
                if (!seenLinks.has(canonicalKey)) {
                    seenLinks.add(canonicalKey)
                    links.push({ source: sourcePath, target: targetPath, sourceRole })
                }
                if (!externalNodes.has(targetPath)) {
                    const entry = entryMap.get(targetPath)
                    if (entry) {
                        const metadata = metadataCache.getFileCache(entry.file)
                        externalNodes.set(targetPath, {
                            id: targetPath,
                            name: entry.file.basename,
                            explored: isNoteExplored(metadata, exploredProperty),
                            connectionCount: 0,
                            external: true,
                            confidence: getNoteConfidence(metadata),
                            wikiRole: getNoteWikiRole(metadata),
                            maturity: getNoteMaturity(metadata, maturityProperty),
                            graduatedNotes: getNoteGraduatedNotes(metadata, graduatedNotesProperty),
                            created: getCreatedTimestamp(entry, metadata),
                            tags: getNoteTags(metadata),
                            frontmatter: getNoteFrontmatter(metadata),
                            frontier: false
                        })
                    }
                }
            }
        }
    }

    // Build frontier nodes from unresolved links
    const frontierNodes = new Map<string, GraphNode>()
    if (showFrontier) {
        for (const sourcePath of filteredPaths) {
            const unresolvedTargets = metadataCache.unresolvedLinks[sourcePath]
            if (!unresolvedTargets) continue
            const sourceRole = nodeRoleMap.get(sourcePath) ?? 'unknown'

            for (const targetName of Object.keys(unresolvedTargets)) {
                const frontierId = `frontier:${targetName}`
                if (!frontierNodes.has(frontierId)) {
                    frontierNodes.set(frontierId, {
                        id: frontierId,
                        name: targetName,
                        explored: false,
                        connectionCount: 0,
                        external: false,
                        confidence: 'unknown',
                        wikiRole: 'unknown',
                        maturity: 'unknown',
                        graduatedNotes: [],
                        created: null,
                        tags: [],
                        frontmatter: {},
                        frontier: true
                    })
                }
                const linkKey = `${sourcePath}|${frontierId}`
                if (!seenLinks.has(linkKey)) {
                    seenLinks.add(linkKey)
                    links.push({
                        source: sourcePath,
                        target: frontierId,
                        sourceRole,
                        toFrontier: true
                    })
                }
            }
        }
    }

    const allNodes = [...nodes, ...externalNodes.values(), ...frontierNodes.values()]

    // Calculate connection counts
    const connectionCounts = new Map<string, number>()
    for (const link of links) {
        connectionCounts.set(link.source, (connectionCounts.get(link.source) ?? 0) + 1)
        connectionCounts.set(link.target, (connectionCounts.get(link.target) ?? 0) + 1)
    }
    for (const node of allNodes) {
        node.connectionCount = connectionCounts.get(node.id) ?? 0
    }

    return { nodes: allNodes, links }
}

function getCreatedTimestamp(
    entry: BasesEntry,
    metadata: Partial<CachedMetadata> | null
): number | null {
    if (metadata?.frontmatter) {
        const created: unknown = metadata.frontmatter['created'] ?? metadata.frontmatter['date']
        if (typeof created === 'string') {
            const parsed = Date.parse(created)
            if (!isNaN(parsed)) return parsed
        }
        if (typeof created === 'number') return created
    }
    return entry.file.stat.ctime
}
