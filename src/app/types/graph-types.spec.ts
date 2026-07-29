import { describe, expect, test } from 'bun:test'
import { NODE_SPACING_MAX, NODE_SPACING_MIN, clampNodeSpacing } from './graph-types'

describe('clampNodeSpacing', () => {
    test('keeps values inside the supported range', () => {
        expect(clampNodeSpacing(1500)).toBe(1500)
        expect(clampNodeSpacing(NODE_SPACING_MIN)).toBe(NODE_SPACING_MIN)
        expect(clampNodeSpacing(NODE_SPACING_MAX)).toBe(NODE_SPACING_MAX)
    })

    test('clamps values outside the supported range', () => {
        expect(clampNodeSpacing(0)).toBe(NODE_SPACING_MIN)
        expect(clampNodeSpacing(-100)).toBe(NODE_SPACING_MIN)
        expect(clampNodeSpacing(99999)).toBe(NODE_SPACING_MAX)
    })
})
