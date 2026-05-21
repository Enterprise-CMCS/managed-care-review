import { rateOverridesToDomainModel } from './parseRateWithHistory'
import type { RateTableWithoutDraftContractsPayload } from './prismaSubmittedRateHelpers'

describe('rateOverridesToDomainModel', () => {
    it('maps rate revision supporting document overrides with the GraphQL/domain field name', () => {
        const rateRevisionID = 'rateRev1'
        const supportingDocumentID = 'supportingDoc1'
        const supportingDocOverrideID = 'supportingDocOverride1'

        const overrides = [
            {
                id: 'rateOverride1',
                createdAt: new Date('2024-01-01'),
                rateID: 'rate1',
                updatedByID: null,
                updatedBy: null,
                description: 'Update supporting document date',
                initiallySubmittedAt: null,
                revisionOverride: {
                    id: 'rateRevisionOverride1',
                    createdAt: new Date('2024-01-01'),
                    rateRevisionID,
                    rateDocuments: [],
                    supportingDocuments: [
                        {
                            id: supportingDocOverrideID,
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
                id: supportingDocOverrideID,
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
