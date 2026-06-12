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
                initiallySubmittedAtOp: null,
                revisionOverride: {
                    id: 'rateRevisionOverride1',
                    createdAt: new Date('2024-01-01'),
                    rateRevisionID,
                    rateDocuments: [],
                    supportingDocuments: [
                        {
                            id: supportingDocOverrideID,
                            createdAt: new Date('2024-01-01'),
                            documentOp: 'OVERRIDE',
                            documentSha256: 'supporting-doc-sha',
                            documentID: supportingDocumentID,
                            name: null,
                            sha256: null,
                            s3URL: null,
                            s3BucketName: null,
                            s3Key: null,
                            dateAdded: new Date('2024-02-01'),
                            dateAddedOp: 'OVERRIDE',
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
                documentOp: 'OVERRIDE',
                documentSha256: 'supporting-doc-sha',
                documentID: supportingDocumentID,
                name: undefined,
                sha256: undefined,
                s3URL: undefined,
                s3BucketName: undefined,
                s3Key: undefined,
                dateAdded: new Date('2024-02-01'),
                dateAddedOp: 'OVERRIDE',
            },
        ])
        expect(
            'supportingDocument' in
                domainOverrides[0].overrides.revisionOverride!
        ).toBe(false)
    })
})
