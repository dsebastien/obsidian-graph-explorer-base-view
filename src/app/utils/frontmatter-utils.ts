import type { App, TFile, CachedMetadata } from 'obsidian'

/**
 * Check if a note is marked as explored based on its cached metadata.
 * Returns false if the property is missing or not a boolean true.
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
