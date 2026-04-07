import type { App, TFile, CachedMetadata } from 'obsidian'
import type { ConfidenceLevel, WikiRole } from '../types/graph-types'

/**
 * Check if a note is marked as explored based on its cached metadata.
 */
export function isNoteExplored(
    metadata: Partial<CachedMetadata> | null,
    propertyName: string
): boolean {
    if (!metadata?.frontmatter) return false
    const value: unknown = metadata.frontmatter[propertyName]
    return value === true
}

/**
 * Set the explored status of a note by updating its frontmatter property.
 */
export async function setNoteExplored(
    app: App,
    file: TFile,
    propertyName: string,
    explored: boolean
): Promise<void> {
    await app.fileManager.processFrontMatter(file, (frontmatter: Record<string, unknown>) => {
        frontmatter[propertyName] = explored
    })
}

/**
 * Get the confidence level from frontmatter.
 */
export function getNoteConfidence(metadata: Partial<CachedMetadata> | null): ConfidenceLevel {
    if (!metadata?.frontmatter) return 'unknown'
    const value: unknown =
        metadata.frontmatter['confidence'] ?? metadata.frontmatter['wiki_confidence']
    if (value === 'high' || value === 'medium' || value === 'low' || value === 'uncertain') {
        return value
    }
    return 'unknown'
}

/**
 * Get the wiki role from frontmatter.
 */
export function getNoteWikiRole(metadata: Partial<CachedMetadata> | null): WikiRole {
    if (!metadata?.frontmatter) return 'unknown'
    const value: unknown = metadata.frontmatter['wiki_role']
    if (value === 'article' || value === 'index' || value === 'log' || value === 'source_summary') {
        return value
    }
    return 'unknown'
}

/**
 * Get tags from cached metadata.
 */
export function getNoteTags(metadata: Partial<CachedMetadata> | null): string[] {
    if (!metadata?.tags) return []
    return metadata.tags.map((t) => t.tag)
}

/**
 * Get frontmatter properties, excluding internal Obsidian fields.
 */
export function getNoteFrontmatter(
    metadata: Partial<CachedMetadata> | null
): Record<string, unknown> {
    if (!metadata?.frontmatter) return {}
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(metadata.frontmatter)) {
        if (key !== 'position') {
            result[key] = value
        }
    }
    return result
}
