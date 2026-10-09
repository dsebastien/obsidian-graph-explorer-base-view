import type { BasesEntry, MetadataCache, CachedMetadata, Reference } from 'obsidian'
import type {
    EdgeSource,
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
    graduatedNotesProperty = 'graduated_notes',
    edgeSource: EdgeSource = 'all'
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

    // Link targets per source, restricted to the selected edge source
    const linkTargets = new Map<string, LinkTargets>()
    for (const sourcePath of filteredPaths) {
        linkTargets.set(
            sourcePath,
            getLinkTargets(sourcePath, entryMap.get(sourcePath), metadataCache, edgeSource)
        )
    }

    // Build links from resolved targets
    const links: GraphLink[] = []
    const seenLinks = new Set<string>()
    const externalNodes = new Map<string, GraphNode>()

    for (const sourcePath of filteredPaths) {
        const targets = linkTargets.get(sourcePath)?.resolved ?? []
        const sourceRole = nodeRoleMap.get(sourcePath) ?? 'unknown'

        for (const targetPath of targets) {
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
            const unresolvedTargets = linkTargets.get(sourcePath)?.unresolved ?? []
            const sourceRole = nodeRoleMap.get(sourcePath) ?? 'unknown'

            for (const targetName of unresolvedTargets) {
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

interface LinkTargets {
    /** Vault paths of existing link targets */
    resolved: string[]
    /** Link paths of targets that do not exist */
    unresolved: string[]
}

/**
 * Collect the link targets of a source note for the given edge source.
 * `all` reads the vault-wide link maps, matching the core graph exactly.
 * `frontmatter` and `body` read the note's own cache, which keeps links
 * declared in properties (`frontmatterLinks`) apart from those in the body
 * (`links` and `embeds`), and resolve each one the way Obsidian does.
 */
function getLinkTargets(
    sourcePath: string,
    entry: BasesEntry | undefined,
    metadataCache: MetadataCache,
    edgeSource: EdgeSource
): LinkTargets {
    if (edgeSource === 'all') {
        return {
            resolved: Object.keys(metadataCache.resolvedLinks[sourcePath] ?? {}),
            unresolved: Object.keys(metadataCache.unresolvedLinks[sourcePath] ?? {})
        }
    }

    const metadata = entry ? metadataCache.getFileCache(entry.file) : null
    const references: Reference[] =
        edgeSource === 'frontmatter'
            ? (metadata?.frontmatterLinks ?? [])
            : [...(metadata?.links ?? []), ...(metadata?.embeds ?? [])]

    const resolved = new Set<string>()
    const unresolved = new Set<string>()
    for (const reference of references) {
        const linkpath = toLinkpath(reference.link)
        if (!linkpath) continue
        const target = metadataCache.getFirstLinkpathDest(linkpath, sourcePath)
        if (target) {
            resolved.add(target.path)
        } else {
            unresolved.add(linkpath)
        }
    }
    return { resolved: [...resolved], unresolved: [...unresolved] }
}

/**
 * Strip the subpath (`#heading`, `#^block`) from a link, like Obsidian's
 * `getLinkpath`, which is not available at runtime under bun:test.
 */
function toLinkpath(link: string): string {
    const hashIndex = link.indexOf('#')
    return (hashIndex === -1 ? link : link.slice(0, hashIndex)).trim()
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
