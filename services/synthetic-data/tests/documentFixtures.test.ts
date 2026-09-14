import { describe, expect, it } from 'vitest'
import {
    documentFixtures,
    loadDocumentFixture,
} from '../src/fixtures/documents'

const fixtures = Object.values(documentFixtures).flatMap((sizes) =>
    Object.values(sizes)
)

describe('documentFixtures', () => {
    it('loads every existing prod-to-Val replacement document', async () => {
        const loaded = await Promise.all(
            fixtures.map(async (fixture) => ({
                fixture,
                bytes: await loadDocumentFixture(fixture),
            }))
        )

        expect(loaded).toHaveLength(12)
        for (const { fixture, bytes } of loaded) {
            expect(bytes.byteLength, fixture.sourceFile).toBeGreaterThan(0)
        }
    })
})
