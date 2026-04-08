import { describe, test, expect, mock } from 'bun:test'
import {
    isNoteExplored,
    setNoteExplored,
    getNoteMaturity,
    getNoteGraduatedNotes,
    setNoteMaturity
} from './frontmatter-utils'

describe('isNoteExplored', () => {
    test('returns false when property is missing from metadata', () => {
        const metadata = { frontmatter: {} }
        expect(isNoteExplored(metadata, 'explored')).toBe(false)
    })

    test('returns false when frontmatter is undefined', () => {
        const metadata = {}
        expect(isNoteExplored(metadata, 'explored')).toBe(false)
    })

    test('returns false when property is false', () => {
        const metadata = { frontmatter: { explored: false } }
        expect(isNoteExplored(metadata, 'explored')).toBe(false)
    })

    test('returns true when property is true', () => {
        const metadata = { frontmatter: { explored: true } }
        expect(isNoteExplored(metadata, 'explored')).toBe(true)
    })

    test('returns false for non-boolean truthy values', () => {
        const metadata = { frontmatter: { explored: 'yes' } }
        expect(isNoteExplored(metadata, 'explored')).toBe(false)
    })

    test('uses custom property name', () => {
        const metadata = { frontmatter: { reviewed: true } }
        expect(isNoteExplored(metadata, 'reviewed')).toBe(true)
    })
})

describe('setNoteExplored', () => {
    test('calls processFrontMatter with correct arguments', async () => {
        const processFrontMatter = mock(
            async (_file: unknown, cb: (fm: Record<string, unknown>) => void) => {
                const fm: Record<string, unknown> = {}
                cb(fm)
                expect(fm['explored']).toBe(true)
            }
        )
        const app = {
            fileManager: { processFrontMatter }
        } as unknown as import('obsidian').App
        const file = { path: 'test.md' } as unknown as import('obsidian').TFile

        await setNoteExplored(app, file, 'explored', true)
        expect(processFrontMatter).toHaveBeenCalledTimes(1)
    })

    test('sets property to false', async () => {
        const processFrontMatter = mock(
            async (_file: unknown, cb: (fm: Record<string, unknown>) => void) => {
                const fm: Record<string, unknown> = { explored: true }
                cb(fm)
                expect(fm['explored']).toBe(false)
            }
        )
        const app = {
            fileManager: { processFrontMatter }
        } as unknown as import('obsidian').App
        const file = { path: 'test.md' } as unknown as import('obsidian').TFile

        await setNoteExplored(app, file, 'explored', false)
        expect(processFrontMatter).toHaveBeenCalledTimes(1)
    })
})

describe('getNoteMaturity', () => {
    test('returns unknown when frontmatter is missing', () => {
        expect(getNoteMaturity({}, 'maturity')).toBe('unknown')
        expect(getNoteMaturity(null, 'maturity')).toBe('unknown')
    })

    test('returns unknown when property is missing', () => {
        expect(getNoteMaturity({ frontmatter: {} }, 'maturity')).toBe('unknown')
    })

    test('returns valid maturity levels', () => {
        expect(getNoteMaturity({ frontmatter: { maturity: 'stub' } }, 'maturity')).toBe('stub')
        expect(getNoteMaturity({ frontmatter: { maturity: 'draft' } }, 'maturity')).toBe('draft')
        expect(getNoteMaturity({ frontmatter: { maturity: 'substantial' } }, 'maturity')).toBe(
            'substantial'
        )
        expect(getNoteMaturity({ frontmatter: { maturity: 'mature' } }, 'maturity')).toBe('mature')
    })

    test('returns unknown for invalid values', () => {
        expect(getNoteMaturity({ frontmatter: { maturity: 'complete' } }, 'maturity')).toBe(
            'unknown'
        )
        expect(getNoteMaturity({ frontmatter: { maturity: 42 } }, 'maturity')).toBe('unknown')
    })

    test('uses custom property name', () => {
        expect(getNoteMaturity({ frontmatter: { depth: 'mature' } }, 'depth')).toBe('mature')
    })
})

describe('getNoteGraduatedNotes', () => {
    test('returns empty array when frontmatter is missing', () => {
        expect(getNoteGraduatedNotes({}, 'graduated_notes')).toEqual([])
        expect(getNoteGraduatedNotes(null, 'graduated_notes')).toEqual([])
    })

    test('returns empty array when property is missing', () => {
        expect(getNoteGraduatedNotes({ frontmatter: {} }, 'graduated_notes')).toEqual([])
    })

    test('returns string values from array', () => {
        const metadata = { frontmatter: { graduated_notes: ['Note A', 'Note B'] } }
        expect(getNoteGraduatedNotes(metadata, 'graduated_notes')).toEqual(['Note A', 'Note B'])
    })

    test('filters out non-string and empty values', () => {
        const metadata = { frontmatter: { graduated_notes: ['Note A', 42, '', 'Note B', null] } }
        expect(getNoteGraduatedNotes(metadata, 'graduated_notes')).toEqual(['Note A', 'Note B'])
    })

    test('returns empty array for non-array values', () => {
        expect(
            getNoteGraduatedNotes({ frontmatter: { graduated_notes: 'single' } }, 'graduated_notes')
        ).toEqual([])
    })

    test('uses custom property name', () => {
        const metadata = { frontmatter: { perm_notes: ['X'] } }
        expect(getNoteGraduatedNotes(metadata, 'perm_notes')).toEqual(['X'])
    })
})

describe('setNoteMaturity', () => {
    test('sets maturity level in frontmatter', async () => {
        const processFrontMatter = mock(
            async (_file: unknown, cb: (fm: Record<string, unknown>) => void) => {
                const fm: Record<string, unknown> = {}
                cb(fm)
                expect(fm['maturity']).toBe('draft')
            }
        )
        const app = {
            fileManager: { processFrontMatter }
        } as unknown as import('obsidian').App
        const file = { path: 'test.md' } as unknown as import('obsidian').TFile

        await setNoteMaturity(app, file, 'maturity', 'draft')
        expect(processFrontMatter).toHaveBeenCalledTimes(1)
    })

    test('removes property when set to unknown', async () => {
        const processFrontMatter = mock(
            async (_file: unknown, cb: (fm: Record<string, unknown>) => void) => {
                const fm: Record<string, unknown> = { maturity: 'draft' }
                cb(fm)
                expect('maturity' in fm).toBe(false)
            }
        )
        const app = {
            fileManager: { processFrontMatter }
        } as unknown as import('obsidian').App
        const file = { path: 'test.md' } as unknown as import('obsidian').TFile

        await setNoteMaturity(app, file, 'maturity', 'unknown')
        expect(processFrontMatter).toHaveBeenCalledTimes(1)
    })

    test('uses custom property name', async () => {
        const processFrontMatter = mock(
            async (_file: unknown, cb: (fm: Record<string, unknown>) => void) => {
                const fm: Record<string, unknown> = {}
                cb(fm)
                expect(fm['depth']).toBe('mature')
            }
        )
        const app = {
            fileManager: { processFrontMatter }
        } as unknown as import('obsidian').App
        const file = { path: 'test.md' } as unknown as import('obsidian').TFile

        await setNoteMaturity(app, file, 'depth', 'mature')
        expect(processFrontMatter).toHaveBeenCalledTimes(1)
    })
})
