import { describe, test, expect, mock } from 'bun:test'
import { isNoteExplored, setNoteExplored } from './frontmatter-utils'

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
