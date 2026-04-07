import { describe, test, expect } from 'bun:test'
import { buildGraphData } from './graph-data-builder'
import type { BasesEntry } from 'obsidian'

function makeEntry(path: string, basename: string): BasesEntry {
    return {
        file: { path, basename } as import('obsidian').TFile,
        getValue: () => null
    } as unknown as BasesEntry
}

function makeMetadataCache(
    resolvedLinks: Record<string, Record<string, number>>,
    frontmatterMap: Record<string, Record<string, unknown> | undefined> = {}
) {
    return {
        resolvedLinks,
        getFileCache: (file: { path: string }) => {
            const fm = frontmatterMap[file.path]
            if (fm) return { frontmatter: fm }
            return null
        }
    }
}

describe('buildGraphData', () => {
    test('creates nodes from entries', () => {
        const entries = [makeEntry('note-a.md', 'note-a'), makeEntry('note-b.md', 'note-b')]
        const cache = makeMetadataCache({})
        const result = buildGraphData(entries, cache as never, 'explored', false, 'all')

        expect(result.nodes).toHaveLength(2)
        expect(result.nodes[0]?.id).toBe('note-a.md')
        expect(result.nodes[0]?.name).toBe('note-a')
        expect(result.nodes[0]?.explored).toBe(false)
        expect(result.nodes[0]?.external).toBe(false)
    })

    test('marks explored notes based on frontmatter', () => {
        const entries = [makeEntry('note-a.md', 'note-a')]
        const cache = makeMetadataCache({}, { 'note-a.md': { explored: true } })
        const result = buildGraphData(entries, cache as never, 'explored', false, 'all')

        expect(result.nodes[0]?.explored).toBe(true)
    })

    test('missing explored property means unexplored', () => {
        const entries = [makeEntry('note-a.md', 'note-a')]
        const cache = makeMetadataCache({}, { 'note-a.md': { title: 'A' } })
        const result = buildGraphData(entries, cache as never, 'explored', false, 'all')

        expect(result.nodes[0]?.explored).toBe(false)
    })

    test('creates links from resolvedLinks between entries', () => {
        const entries = [makeEntry('a.md', 'a'), makeEntry('b.md', 'b')]
        const links = { 'a.md': { 'b.md': 1 } }
        const cache = makeMetadataCache(links)
        const result = buildGraphData(entries, cache as never, 'explored', false, 'all')

        expect(result.links).toHaveLength(1)
        expect(result.links[0]?.source).toBe('a.md')
        expect(result.links[0]?.target).toBe('b.md')
    })

    test('deduplicates bidirectional links', () => {
        const entries = [makeEntry('a.md', 'a'), makeEntry('b.md', 'b')]
        const links = { 'a.md': { 'b.md': 1 }, 'b.md': { 'a.md': 1 } }
        const cache = makeMetadataCache(links)
        const result = buildGraphData(entries, cache as never, 'explored', false, 'all')

        expect(result.links).toHaveLength(1)
    })

    test('does not include external nodes when showExternal is false', () => {
        const entries = [makeEntry('a.md', 'a')]
        const links = { 'a.md': { 'external.md': 1 } }
        const cache = makeMetadataCache(links)
        const result = buildGraphData(entries, cache as never, 'explored', false, 'all')

        expect(result.nodes).toHaveLength(1)
        expect(result.links).toHaveLength(0)
    })

    test('includes external nodes when showExternal is true', () => {
        const entries = [makeEntry('a.md', 'a')]
        const links = { 'a.md': { 'external.md': 1 } }
        const cache = makeMetadataCache(links)
        const result = buildGraphData(entries, cache as never, 'explored', true, 'all')

        expect(result.nodes).toHaveLength(2)
        const externalNode = result.nodes.find((n) => n.id === 'external.md')
        expect(externalNode?.external).toBe(true)
        expect(externalNode?.name).toBe('external')
        expect(result.links).toHaveLength(1)
    })

    test('filters to explored only', () => {
        const entries = [makeEntry('a.md', 'a'), makeEntry('b.md', 'b')]
        const cache = makeMetadataCache({}, { 'a.md': { explored: true } })
        const result = buildGraphData(entries, cache as never, 'explored', false, 'explored')

        expect(result.nodes).toHaveLength(1)
        expect(result.nodes[0]?.id).toBe('a.md')
    })

    test('filters to unexplored only', () => {
        const entries = [makeEntry('a.md', 'a'), makeEntry('b.md', 'b')]
        const cache = makeMetadataCache({}, { 'a.md': { explored: true } })
        const result = buildGraphData(entries, cache as never, 'explored', false, 'unexplored')

        expect(result.nodes).toHaveLength(1)
        expect(result.nodes[0]?.id).toBe('b.md')
    })

    test('calculates connectionCount correctly', () => {
        const entries = [makeEntry('a.md', 'a'), makeEntry('b.md', 'b'), makeEntry('c.md', 'c')]
        const links = { 'a.md': { 'b.md': 1, 'c.md': 1 } }
        const cache = makeMetadataCache(links)
        const result = buildGraphData(entries, cache as never, 'explored', false, 'all')

        const nodeA = result.nodes.find((n) => n.id === 'a.md')
        expect(nodeA?.connectionCount).toBe(2)
    })

    test('returns empty graph for empty entries', () => {
        const cache = makeMetadataCache({})
        const result = buildGraphData([], cache as never, 'explored', false, 'all')

        expect(result.nodes).toHaveLength(0)
        expect(result.links).toHaveLength(0)
    })
})
