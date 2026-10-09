import { describe, test, expect } from 'bun:test'
import { buildGraphData } from './graph-data-builder'
import type { BasesEntry } from 'obsidian'

function makeEntry(path: string, basename: string): BasesEntry {
    return {
        file: {
            path,
            basename,
            stat: { ctime: Date.now(), mtime: Date.now(), size: 100 }
        } as import('obsidian').TFile,
        getValue: () => null
    } as unknown as BasesEntry
}

function makeMetadataCache(
    resolvedLinks: Record<string, Record<string, number>>,
    frontmatterMap: Record<string, Record<string, unknown> | undefined> = {},
    unresolvedLinks: Record<string, Record<string, number>> = {}
) {
    return {
        resolvedLinks,
        unresolvedLinks,
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
        const result = buildGraphData(entries, cache as never, 'explored', false, 'all', false)

        expect(result.nodes).toHaveLength(2)
        expect(result.nodes[0]?.id).toBe('note-a.md')
        expect(result.nodes[0]?.name).toBe('note-a')
        expect(result.nodes[0]?.explored).toBe(false)
        expect(result.nodes[0]?.external).toBe(false)
    })

    test('marks explored notes based on frontmatter', () => {
        const entries = [makeEntry('note-a.md', 'note-a')]
        const cache = makeMetadataCache({}, { 'note-a.md': { explored: true } })
        const result = buildGraphData(entries, cache as never, 'explored', false, 'all', false)

        expect(result.nodes[0]?.explored).toBe(true)
    })

    test('missing explored property means unexplored', () => {
        const entries = [makeEntry('note-a.md', 'note-a')]
        const cache = makeMetadataCache({}, { 'note-a.md': { title: 'A' } })
        const result = buildGraphData(entries, cache as never, 'explored', false, 'all', false)

        expect(result.nodes[0]?.explored).toBe(false)
    })

    test('creates links from resolvedLinks between entries', () => {
        const entries = [makeEntry('a.md', 'a'), makeEntry('b.md', 'b')]
        const links = { 'a.md': { 'b.md': 1 } }
        const cache = makeMetadataCache(links)
        const result = buildGraphData(entries, cache as never, 'explored', false, 'all', false)

        expect(result.links).toHaveLength(1)
        expect(result.links[0]?.source).toBe('a.md')
        expect(result.links[0]?.target).toBe('b.md')
    })

    test('deduplicates bidirectional links', () => {
        const entries = [makeEntry('a.md', 'a'), makeEntry('b.md', 'b')]
        const links = { 'a.md': { 'b.md': 1 }, 'b.md': { 'a.md': 1 } }
        const cache = makeMetadataCache(links)
        const result = buildGraphData(entries, cache as never, 'explored', false, 'all', false)

        expect(result.links).toHaveLength(1)
    })

    test('does not include external nodes when showExternal is false', () => {
        const entries = [makeEntry('a.md', 'a')]
        const links = { 'a.md': { 'external.md': 1 } }
        const cache = makeMetadataCache(links)
        const result = buildGraphData(entries, cache as never, 'explored', false, 'all', false)

        expect(result.nodes).toHaveLength(1)
        expect(result.links).toHaveLength(0)
    })

    test('includes external nodes when showExternal is true', () => {
        const entries = [makeEntry('a.md', 'a')]
        const links = { 'a.md': { 'external.md': 1 } }
        const cache = makeMetadataCache(links)
        const result = buildGraphData(entries, cache as never, 'explored', true, 'all', false)

        expect(result.nodes).toHaveLength(2)
        const externalNode = result.nodes.find((n) => n.id === 'external.md')
        expect(externalNode?.external).toBe(true)
        expect(externalNode?.name).toBe('external')
        expect(result.links).toHaveLength(1)
    })

    test('filters to explored only', () => {
        const entries = [makeEntry('a.md', 'a'), makeEntry('b.md', 'b')]
        const cache = makeMetadataCache({}, { 'a.md': { explored: true } })
        const result = buildGraphData(entries, cache as never, 'explored', false, 'explored', false)

        expect(result.nodes).toHaveLength(1)
        expect(result.nodes[0]?.id).toBe('a.md')
    })

    test('filters to unexplored only', () => {
        const entries = [makeEntry('a.md', 'a'), makeEntry('b.md', 'b')]
        const cache = makeMetadataCache({}, { 'a.md': { explored: true } })
        const result = buildGraphData(
            entries,
            cache as never,
            'explored',
            false,
            'unexplored',
            false
        )

        expect(result.nodes).toHaveLength(1)
        expect(result.nodes[0]?.id).toBe('b.md')
    })

    test('calculates connectionCount correctly', () => {
        const entries = [makeEntry('a.md', 'a'), makeEntry('b.md', 'b'), makeEntry('c.md', 'c')]
        const links = { 'a.md': { 'b.md': 1, 'c.md': 1 } }
        const cache = makeMetadataCache(links)
        const result = buildGraphData(entries, cache as never, 'explored', false, 'all', false)

        const nodeA = result.nodes.find((n) => n.id === 'a.md')
        expect(nodeA?.connectionCount).toBe(2)
    })

    test('returns empty graph for empty entries', () => {
        const cache = makeMetadataCache({})
        const result = buildGraphData([], cache as never, 'explored', false, 'all', false)

        expect(result.nodes).toHaveLength(0)
        expect(result.links).toHaveLength(0)
    })

    test('creates frontier nodes from unresolved links', () => {
        const entries = [makeEntry('a.md', 'a')]
        const cache = makeMetadataCache({}, {}, { 'a.md': { 'Missing Note': 1 } })
        const result = buildGraphData(entries, cache as never, 'explored', false, 'all', true)

        expect(result.nodes).toHaveLength(2)
        const frontier = result.nodes.find((n) => n.frontier)
        expect(frontier?.name).toBe('Missing Note')
        expect(frontier?.frontier).toBe(true)
        expect(result.links).toHaveLength(1)
        expect(result.links[0]?.toFrontier).toBe(true)
    })

    test('does not create frontier nodes when showFrontier is false', () => {
        const entries = [makeEntry('a.md', 'a')]
        const cache = makeMetadataCache({}, {}, { 'a.md': { 'Missing Note': 1 } })
        const result = buildGraphData(entries, cache as never, 'explored', false, 'all', false)

        expect(result.nodes).toHaveLength(1)
        expect(result.links).toHaveLength(0)
    })

    test('extracts confidence and wiki_role from frontmatter', () => {
        const entries = [makeEntry('a.md', 'a')]
        const cache = makeMetadataCache(
            {},
            { 'a.md': { confidence: 'high', wiki_role: 'article' } }
        )
        const result = buildGraphData(entries, cache as never, 'explored', false, 'all', false)

        expect(result.nodes[0]?.confidence).toBe('high')
        expect(result.nodes[0]?.wikiRole).toBe('article')
    })

    test('extracts maturity from frontmatter', () => {
        const entries = [makeEntry('a.md', 'a')]
        const cache = makeMetadataCache({}, { 'a.md': { maturity: 'draft' } })
        const result = buildGraphData(
            entries,
            cache as never,
            'explored',
            false,
            'all',
            false,
            'maturity'
        )

        expect(result.nodes[0]?.maturity).toBe('draft')
    })

    test('extracts graduated_notes from frontmatter', () => {
        const entries = [makeEntry('a.md', 'a')]
        const cache = makeMetadataCache({}, { 'a.md': { graduated_notes: ['Note X', 'Note Y'] } })
        const result = buildGraphData(
            entries,
            cache as never,
            'explored',
            false,
            'all',
            false,
            'maturity',
            'graduated_notes'
        )

        expect(result.nodes[0]?.graduatedNotes).toEqual(['Note X', 'Note Y'])
    })

    test('defaults maturity to unknown and graduatedNotes to empty', () => {
        const entries = [makeEntry('a.md', 'a')]
        const cache = makeMetadataCache({})
        const result = buildGraphData(entries, cache as never, 'explored', false, 'all', false)

        expect(result.nodes[0]?.maturity).toBe('unknown')
        expect(result.nodes[0]?.graduatedNotes).toEqual([])
    })

    test('uses custom maturity property name', () => {
        const entries = [makeEntry('a.md', 'a')]
        const cache = makeMetadataCache({}, { 'a.md': { depth: 'mature' } })
        const result = buildGraphData(
            entries,
            cache as never,
            'explored',
            false,
            'all',
            false,
            'depth'
        )

        expect(result.nodes[0]?.maturity).toBe('mature')
    })

    test('external nodes default to unknown maturity and empty graduatedNotes', () => {
        const entries = [makeEntry('a.md', 'a')]
        const links = { 'a.md': { 'external.md': 1 } }
        const cache = makeMetadataCache(links)
        const result = buildGraphData(entries, cache as never, 'explored', true, 'all', false)

        const externalNode = result.nodes.find((n) => n.id === 'external.md')
        expect(externalNode?.maturity).toBe('unknown')
        expect(externalNode?.graduatedNotes).toEqual([])
    })

    test('frontier nodes default to unknown maturity and empty graduatedNotes', () => {
        const entries = [makeEntry('a.md', 'a')]
        const cache = makeMetadataCache({}, {}, { 'a.md': { 'Missing Note': 1 } })
        const result = buildGraphData(entries, cache as never, 'explored', false, 'all', true)

        const frontier = result.nodes.find((n) => n.frontier)
        expect(frontier?.maturity).toBe('unknown')
        expect(frontier?.graduatedNotes).toEqual([])
    })

    test('nodes have x and y properties available for position tracking', () => {
        const entries = [makeEntry('a.md', 'a')]
        const cache = makeMetadataCache({})
        const result = buildGraphData(entries, cache as never, 'explored', false, 'all', false)

        const node = result.nodes[0]
        // NodeObject provides x/y/fx/fy — they start undefined before force sim
        expect(node).toBeDefined()
        expect(node?.id).toBe('a.md')
    })
})

describe('buildGraphData edge source', () => {
    // a.md declares b.md in frontmatter and mentions c.md (and a missing note)
    // in its body; resolvedLinks merges all of them, as Obsidian does.
    const vault = new Set(['a.md', 'b.md', 'c.md', 'd.md'])
    const fileCaches: Record<string, Record<string, unknown>> = {
        'a.md': {
            frontmatterLinks: [
                { key: 'grounds', link: 'b', original: '[[b]]' },
                { key: 'poles.0.target', link: 'Missing Pole', original: '[[Missing Pole]]' }
            ],
            links: [
                { link: 'c#Heading', original: '[[c#Heading]]' },
                { link: 'b', original: '[[b]]' },
                { link: 'Missing Prose', original: '[[Missing Prose]]' }
            ],
            embeds: [{ link: 'd', original: '![[d]]' }]
        }
    }

    function makeCache() {
        return {
            resolvedLinks: { 'a.md': { 'b.md': 2, 'c.md': 1, 'd.md': 1 } },
            unresolvedLinks: { 'a.md': { 'Missing Pole': 1, 'Missing Prose': 1 } },
            getFileCache: (file: { path: string }) => fileCaches[file.path] ?? null,
            getFirstLinkpathDest: (linkpath: string) => {
                const path = `${linkpath}.md`
                return vault.has(path) ? { path } : null
            }
        }
    }

    const entries = [
        makeEntry('a.md', 'a'),
        makeEntry('b.md', 'b'),
        makeEntry('c.md', 'c'),
        makeEntry('d.md', 'd')
    ]

    function targetsOf(edgeSource: 'all' | 'frontmatter' | 'body', showFrontier = false) {
        const result = buildGraphData(
            entries,
            makeCache() as never,
            'explored',
            false,
            'all',
            showFrontier,
            'maturity',
            'graduated_notes',
            edgeSource
        )
        return result.links.map((l) => String(l.target)).sort()
    }

    test('all keeps every resolved link (default behavior)', () => {
        expect(targetsOf('all')).toEqual(['b.md', 'c.md', 'd.md'])
    })

    test('defaults to all when the edge source is omitted', () => {
        const result = buildGraphData(
            entries,
            makeCache() as never,
            'explored',
            false,
            'all',
            false
        )
        expect(result.links.map((l) => String(l.target)).sort()).toEqual(['b.md', 'c.md', 'd.md'])
    })

    test('frontmatter keeps only links declared in properties', () => {
        expect(targetsOf('frontmatter')).toEqual(['b.md'])
    })

    test('body keeps links and embeds from the note body, stripping subpaths', () => {
        expect(targetsOf('body')).toEqual(['b.md', 'c.md', 'd.md'])
    })

    test('frontier nodes follow the edge source', () => {
        expect(targetsOf('frontmatter', true)).toEqual(['b.md', 'frontier:Missing Pole'])
        expect(targetsOf('body', true)).toEqual(['b.md', 'c.md', 'd.md', 'frontier:Missing Prose'])
    })

    test('connection counts reflect only the kept edges', () => {
        const result = buildGraphData(
            entries,
            makeCache() as never,
            'explored',
            false,
            'all',
            false,
            'maturity',
            'graduated_notes',
            'frontmatter'
        )
        const counts = Object.fromEntries(result.nodes.map((n) => [n.id, n.connectionCount]))
        expect(counts).toEqual({ 'a.md': 1, 'b.md': 1, 'c.md': 0, 'd.md': 0 })
    })
})
