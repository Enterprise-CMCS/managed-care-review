import { buildDocumentChanges } from './revisionDiffDocuments'
import { mockSubmittableHealthPlanContract } from '../../testHelpers'
import type {
    ContractPackageSubmissionType,
    RateRevisionType,
    RevisionDiffRevisedRate,
    UpdateInfoType,
} from '../../domain-models'
import type { DocumentType } from '../../domain-models/contractAndRates'

const mockUpdateInfo = (): UpdateInfoType => ({
    updatedAt: new Date('2026-07-27T12:00:00.000Z'),
    updatedBy: {
        createdAt: new Date('2026-07-27T12:00:00.000Z'),
        updatedAt: new Date('2026-07-27T12:00:00.000Z'),
        givenName: 'Test',
        familyName: 'User',
        email: 'test@example.com',
        role: 'STATE_USER',
    },
    updatedReason: 'submit',
})

const mockDocument = (name: string, sha256: string): DocumentType => ({
    name,
    s3URL: `s3://bucketname/key/${name}`,
    sha256,
})

const mockRateRevision = (
    overrides?: Partial<RateRevisionType>
): RateRevisionType => ({
    id: '11111111-1111-1111-1111-111111111111',
    rateID: '22222222-2222-2222-2222-222222222222',
    submitInfo: mockUpdateInfo(),
    unlockInfo: undefined,
    undoUnlockInfo: undefined,
    createdAt: new Date('2026-07-27T12:00:00.000Z'),
    updatedAt: new Date('2026-07-27T12:00:00.000Z'),
    formData: {
        rateType: 'AMENDMENT',
        rateCapitationType: 'RATE_CELL',
        rateDateStart: new Date('2024-01-01T00:00:00.000Z'),
        rateDateEnd: new Date('2025-01-01T00:00:00.000Z'),
        rateDateCertified: new Date('2024-01-02T00:00:00.000Z'),
        rateMedicaidPopulations: ['MEDICARE_MEDICAID_WITHOUT_DSNP'],
        amendmentEffectiveDateStart: new Date('2024-02-01T00:00:00.000Z'),
        amendmentEffectiveDateEnd: new Date('2025-02-01T00:00:00.000Z'),
        rateProgramIDs: ['33333333-3333-3333-3333-333333333333'],
        deprecatedRateProgramIDs: [],
        rateCertificationName: 'RATE-ONE',
        rateDocuments: [],
        supportingDocuments: [],
        certifyingActuaryContacts: [],
        addtlActuaryContacts: [],
        actuaryCommunicationPreference: 'OACT_TO_ACTUARY',
    },
    ...overrides,
})

const mockSubmission = (
    overrides?: Partial<ContractPackageSubmissionType>
): ContractPackageSubmissionType => {
    const contract = mockSubmittableHealthPlanContract()

    return {
        submitInfo: mockUpdateInfo(),
        submittedRevisions: [],
        contractRevision: {
            ...contract.draftRevision!,
            submitInfo: mockUpdateInfo(),
        },
        rateRevisions: [],
        ...overrides,
    }
}

const mockRevisedRate = (
    overrides?: Partial<RevisionDiffRevisedRate>
): RevisionDiffRevisedRate => ({
    rateID: '22222222-2222-2222-2222-222222222222',
    rateCertificationName: 'RATE-ONE',
    fieldChanges: [],
    rateDocuments: {
        added: [],
        removed: [],
    },
    supportingRateDocuments: {
        added: [],
        removed: [],
    },
    certifyingActuaryContactChanges: [],
    addtlActuaryContactChanges: [],
    ...overrides,
})

describe('revisionDiffDocuments', () => {
    it('builds contract and rate document add/remove changes keyed by sha256 and name', () => {
        const contract = mockSubmittableHealthPlanContract()

        const previous = mockSubmission({
            contractRevision: {
                ...contract.draftRevision!,
                formData: {
                    ...contract.draftRevision!.formData,
                    contractDocuments: [
                        mockDocument(
                            'contract-removed.pdf',
                            'contract-removed'
                        ),
                    ],
                    supportingDocuments: [
                        mockDocument('support-removed.pdf', 'support-removed'),
                    ],
                },
            },
            rateRevisions: [
                mockRateRevision({
                    formData: {
                        ...mockRateRevision().formData,
                        rateCertificationName: 'RATE-ONE',
                        rateDocuments: [
                            mockDocument(
                                'rate-doc-removed.xlsx',
                                'rate-doc-removed'
                            ),
                        ],
                        supportingDocuments: [
                            mockDocument(
                                'rate-support-removed.pdf',
                                'rate-support-removed'
                            ),
                        ],
                    },
                }),
            ],
        })

        const current = mockSubmission({
            contractRevision: {
                ...previous.contractRevision,
                formData: {
                    ...previous.contractRevision.formData,
                    contractDocuments: [
                        mockDocument('contract-added.pdf', 'contract-added'),
                    ],
                    supportingDocuments: [],
                },
            },
            rateRevisions: [
                {
                    ...previous.rateRevisions[0],
                    formData: {
                        ...previous.rateRevisions[0]!.formData,
                        rateCertificationName: 'RATE-ONE',
                        rateDocuments: [
                            mockDocument(
                                'rate-doc-added.xlsx',
                                'rate-doc-added'
                            ),
                        ],
                        supportingDocuments: [],
                    },
                },
            ],
        })

        expect(
            buildDocumentChanges(previous, current, [
                mockRevisedRate({
                    rateDocuments: {
                        added: ['rate-doc-added.xlsx'],
                        removed: ['rate-doc-removed.xlsx'],
                    },
                    supportingRateDocuments: {
                        added: [],
                        removed: ['rate-support-removed.pdf'],
                    },
                }),
            ])
        ).toEqual({
            contractDocuments: {
                added: ['contract-added.pdf'],
                removed: ['contract-removed.pdf'],
            },
            contractSupportingDocuments: {
                added: [],
                removed: ['support-removed.pdf'],
            },
            ratesDocuments: [
                {
                    rateID: '22222222-2222-2222-2222-222222222222',
                    rateCertificationName: 'RATE-ONE',
                    rateDocuments: {
                        added: ['rate-doc-added.xlsx'],
                        removed: ['rate-doc-removed.xlsx'],
                    },
                    supportingDocuments: {
                        added: [],
                        removed: ['rate-support-removed.pdf'],
                    },
                },
            ],
            totalAdded: 2,
            totalRemoved: 4,
        })
    })

    it('treats documents with the same sha256 but different names as changed', () => {
        const previous = mockSubmission({
            contractRevision: {
                ...mockSubmittableHealthPlanContract().draftRevision!,
                formData: {
                    ...mockSubmittableHealthPlanContract().draftRevision!
                        .formData,
                    contractDocuments: [
                        mockDocument('contract-original.pdf', 'shared-sha'),
                    ],
                    supportingDocuments: [],
                },
            },
        })

        const current = mockSubmission({
            contractRevision: {
                ...previous.contractRevision,
                formData: {
                    ...previous.contractRevision.formData,
                    contractDocuments: [
                        mockDocument('contract-renamed.pdf', 'shared-sha'),
                    ],
                    supportingDocuments: [],
                },
            },
        })

        expect(buildDocumentChanges(previous, current, [])).toEqual({
            contractDocuments: {
                added: ['contract-renamed.pdf'],
                removed: ['contract-original.pdf'],
            },
            contractSupportingDocuments: {
                added: [],
                removed: [],
            },
            ratesDocuments: [],
            totalAdded: 1,
            totalRemoved: 1,
        })
    })
})
