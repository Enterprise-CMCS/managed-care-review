import { rateOverridesToDomainModel } from './parseRateWithHistory'
import type { RateTableWithoutDraftContractsPayload } from './prismaSubmittedRateHelpers'

describe('rateOverridesToDomainModel', () => {
    it('maps rate revision supporting document overrides with the GraphQL/domain field name', () => {
        const rateRevisionID = '11111111-1111-1111-1111-111111111111'
        const supportingDocumentID = '22222222-2222-2222-2222-222222222222'

        const overrides = [
            {
                id: '33333333-3333-3333-3333-333333333333',
                createdAt: new Date('2024-01-01'),
                rateID: '66666666-6666-6666-6666-666666666666',
                updatedByID: null,
                updatedBy: null,
                description: 'Update supporting document date',
                initiallySubmittedAt: null,
                revisionOverride: {
                    id: '44444444-4444-4444-4444-444444444444',
                    createdAt: new Date('2024-01-01'),
                    rateRevisionID,
                    rateDocuments: [],
                    supportingDocuments: [
                        {
                            id: '55555555-5555-5555-5555-555555555555',
                            createdAt: new Date('2024-01-01'),
                            documentID: supportingDocumentID,
                            dateAdded: new Date('2024-02-01'),
                        },
                    ],
                },
            },
        ] as RateTableWithoutDraftContractsPayload['rateOverrides']

        const domainOverrides = rateOverridesToDomainModel(overrides)

        expect(
            domainOverrides[0].overrides.revisionOverride?.supportingDocuments
        ).toEqual([
            {
                id: '55555555-5555-5555-5555-555555555555',
                createdAt: new Date('2024-01-01'),
                documentID: supportingDocumentID,
                dateAdded: new Date('2024-02-01'),
            },
        ])
        expect(
            'supportingDocument' in
                domainOverrides[0].overrides.revisionOverride!
        ).toBe(false)
    })
})
