import type { GraphQLResolveInfo } from 'graphql'
import { mockEQROContract, mockMNState } from '../../testHelpers/emailerHelpers'
import { defaultContext } from '../../testHelpers/gqlHelpers'
import { mockStoreThatErrors } from '../../testHelpers/storeHelpers'
import {
    contractRevisionResolver,
    contractRevisionStrippedResolver,
} from './contractRevisionResolver'

describe.each([
    ['full revision', contractRevisionResolver],
    ['index revision', contractRevisionStrippedResolver],
] as const)('%s submission ID', (_name, makeResolver) => {
    it('displays existing EQRO revisions with the new ID and stored sequence', async () => {
        const store = mockStoreThatErrors()
        store.findStatePrograms = () => mockMNState().programs
        const resolveName = makeResolver(store)?.contractName
        if (typeof resolveName !== 'function') {
            throw new Error('Missing contractName resolver')
        }
        const revision =
            mockEQROContract().packageSubmissions[0].contractRevision

        expect(
            await resolveName(
                revision,
                {},
                defaultContext(),
                {} as GraphQLResolveInfo
            )
        ).toBe('MCR-EQRO-MN-0004')

        revision.contract.stateNumber = 5
        revision.formData.programIDs = []
        expect(
            await resolveName(
                revision,
                {},
                defaultContext(),
                {} as GraphQLResolveInfo
            )
        ).toBe('MCR-EQRO-MN-0005')
    })

    it('preserves health plan revision IDs', async () => {
        const store = mockStoreThatErrors()
        store.findStatePrograms = () => mockMNState().programs
        const resolveName = makeResolver(store)?.contractName
        if (typeof resolveName !== 'function') {
            throw new Error('Missing contractName resolver')
        }
        const revision =
            mockEQROContract().packageSubmissions[0].contractRevision
        revision.contract.contractSubmissionType = 'HEALTH_PLAN'

        expect(
            await resolveName(
                revision,
                {},
                defaultContext(),
                {} as GraphQLResolveInfo
            )
        ).toBe('MCR-MN-0004-SNBC')
    })
})
