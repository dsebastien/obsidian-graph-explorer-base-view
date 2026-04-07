import type { BasesEntry, MetadataCache } from 'obsidian'
import type { GraphData, GraphNode, GraphLink, ExploredFilter } from '../types/graph-types'
import { isNoteExplored } from '../utils/frontmatter-utils'

/**
 * Build graph data from Base entries and the vault's resolved links.
 */
export function buildGraphData(
    entries: BasesEntry[],
    metadataCache: MetadataCache,
    exploredProperty: string,
    showExternal: boolean,
    exploredFilter: ExploredFilter
): GraphData {
    const entryPaths = new Set<string>(entries.map((e) => e.file.path))

    // Build nodes from entries with explored status
    let nodes: GraphNode[] = entries.map((entry) => {
        const metadata = metadataCache.getFileCache(entry.file)
        const explored = isNoteExplored(metadata, exploredProperty)
        return {
            id: entry.file.path,
            name: entry.file.basename,
            explored,
            connectionCount: 0,
            external: false
        }
    })

    // Apply explored filter
    if (exploredFilter === 'explored') {
        nodes = nodes.filter((n) => n.explored)
    } else if (exploredFilter === 'unexplored') {
        nodes = nodes.filter((n) => !n.explored)
    }

    const filteredPaths = new Set<string>(nodes.map((n) => n.id))

    // Build links from resolvedLinks
    const links: GraphLink[] = []
    const seenLinks = new Set<string>()
    const externalNodes = new Map<string, GraphNode>()

    for (const sourcePath of filteredPaths) {
        const targets = metadataCache.resolvedLinks[sourcePath]
        if (!targets) continue

        for (const targetPath of Object.keys(targets)) {
            const targetInFiltered = filteredPaths.has(targetPath)
            const targetInEntries = entryPaths.has(targetPath)

            if (targetInFiltered) {
                const canonicalKey = [sourcePath, targetPath].sort().join('|')
                if (!seenLinks.has(canonicalKey)) {
                    seenLinks.add(canonicalKey)
                    links.push({ source: sourcePath, target: targetPath })
                }
            } else if (showExternal && !targetInEntries) {
                const canonicalKey = [sourcePath, targetPath].sort().join('|')
                if (!seenLinks.has(canonicalKey)) {
                    seenLinks.add(canonicalKey)
                    links.push({ source: sourcePath, target: targetPath })
                }
                if (!externalNodes.has(targetPath)) {
                    const basename = targetPath.replace(/\.md$/, '').split('/').pop() ?? targetPath
                    externalNodes.set(targetPath, {
                        id: targetPath,
                        name: basename,
                        explored: false,
                        connectionCount: 0,
                        external: true
                    })
                }
            } else if (showExternal && targetInEntries && !targetInFiltered) {
                const canonicalKey = [sourcePath, targetPath].sort().join('|')
                if (!seenLinks.has(canonicalKey)) {
                    seenLinks.add(canonicalKey)
                    links.push({ source: sourcePath, target: targetPath })
                }
                if (!externalNodes.has(targetPath)) {
                    const entry = entries.find((e) => e.file.path === targetPath)
                    if (entry) {
                        const metadata = metadataCache.getFileCache(entry.file)
                        externalNodes.set(targetPath, {
                            id: targetPath,
                            name: entry.file.basename,
                            explored: isNoteExplored(metadata, exploredProperty),
                            connectionCount: 0,
                            external: true
                        })
                    }
                }
            }
        }
    }

    const allNodes = [...nodes, ...externalNodes.values()]

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
