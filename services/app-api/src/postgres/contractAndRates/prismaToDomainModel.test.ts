import { v4 as uuidv4 } from 'uuid'
import { mockContractRevision } from '../../testHelpers/contractDataMocks'
import { mockRateRevision } from '../../testHelpers/rateDataMocks'
import {
    getContractRateStatus,
    contractFormDataToDomainModel,
    rateFormDataToDomainModel,
} from './prismaSharedContractRateHelpers'
import { strippedRateRevisionToDomainModel } from './parseRateWithHistory'
import type { ContractRevisionTableWithFormData } from './prismaSharedContractRateHelpers'

describe('prismaToDomainModel', () => {
    describe('contractFormDataToDomainModel', () => {
        it('correctly adds document categories to each document', () => {
            const contractRevision = mockContractRevision()

            const domainFormData =
                contractFormDataToDomainModel(contractRevision)

            expect(domainFormData).toEqual(
                expect.objectContaining({
                    supportingDocuments: expect.arrayContaining([
                        expect.objectContaining({
                            name: 'contract supporting doc',
                            s3URL: 's3://bucketname/key/test1',
                            sha256: '2342fwlkdmwvw',
                        }),
                        expect.objectContaining({
                            name: 'contract supporting doc 2',
                            s3URL: 's3://bucketname/key/test1',
                            sha256: '45662342fwlkdmwvw',
                        }),
                    ]),
                    contractDocuments: expect.arrayContaining([
                        expect.objectContaining({
                            name: 'contract doc',
                            s3URL: 's3://bucketname/key/test1',
                            sha256: '8984234fwlkdmwvw',
                        }),
                    ]),
                })
            )
        })

        it('applies the latest matching contract revision override', () => {
            const contractRevisionID = uuidv4()
            const contractRevision = mockContractRevision(undefined, {
                id: contractRevisionID,
                contractType: 'BASE',
                dsnpContract: false,
                revisionOverrides: [
                    {
                        id: uuidv4(),
                        createdAt: new Date(),
                        contractRevisionID,
                        contractType: 'AMENDMENT',
                        contractTypeOp: 'OVERRIDE',
                        dsnpContract: true,
                        dsnpContractOp: 'OVERRIDE',
                        contractDocuments: [],
                        supportingDocuments: [],
                    },
                ],
            })

            const domainFormData =
                contractFormDataToDomainModel(contractRevision)

            expect(domainFormData.contractType).toBe('AMENDMENT')
            expect(domainFormData.dsnpContract).toBe(true)
        })

        const ilosRows = {
            isILOSRatesIncluded: true,
            ilosDocuments: [
                {
                    id: uuidv4(),
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    position: 0,
                    name: 'ilos report',
                    s3URL: 's3://bucketname/key/ilosreport',
                    s3BucketName: 'bucketname',
                    s3Key: 'key/ilosreport',
                    sha256: 'ilosreportsha',
                    dateAdded: null,
                    contractRevisionID: 'rev',
                },
            ],
            ilosSupportingDocuments: [
                {
                    id: uuidv4(),
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    position: 0,
                    name: 'ilos supporting',
                    s3URL: 's3://bucketname/key/ilossupporting',
                    s3BucketName: 'bucketname',
                    s3Key: 'key/ilossupporting',
                    sha256: 'ilossupportingsha',
                    dateAdded: new Date('2024-01-15'),
                    contractRevisionID: 'rev',
                },
            ],
            ilosExternalRates: [
                {
                    id: uuidv4(),
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    position: 2,
                    rateControlName: 'FL-RATE-001',
                    rateDateStart: new Date('2025-01-01'),
                    rateDateEnd: new Date('2025-12-31'),
                    contractRevisionID: 'rev',
                },
                {
                    id: uuidv4(),
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    position: 3,
                    rateControlName: null,
                    rateDateStart: null,
                    rateDateEnd: null,
                    contractRevisionID: 'rev',
                },
            ],
        }

        it('maps ILOS columns and relations for an ILOS submission', () => {
            const contractRevision = mockContractRevision(
                { contractSubmissionType: 'ILOS' },
                ilosRows
            )

            const domainFormData =
                contractFormDataToDomainModel(contractRevision)

            expect(domainFormData.isILOSRatesIncluded).toBe(true)
            expect(domainFormData.ilosDocuments).toEqual([
                expect.objectContaining({
                    name: 'ilos report',
                    s3URL: 's3://bucketname/key/ilosreport',
                    s3BucketName: 'bucketname',
                    s3Key: 'key/ilosreport',
                    sha256: 'ilosreportsha',
                    dateAdded: undefined,
                }),
            ])
            expect(domainFormData.ilosSupportingDocuments).toEqual([
                expect.objectContaining({
                    name: 'ilos supporting',
                    sha256: 'ilossupportingsha',
                    dateAdded: new Date('2024-01-15'),
                }),
            ])
            expect(domainFormData.ilosExternalRates).toEqual([
                {
                    id: ilosRows.ilosExternalRates[0].id,
                    rateControlName: 'FL-RATE-001',
                    rateDateStart: new Date('2025-01-01'),
                    rateDateEnd: new Date('2025-12-31'),
                    position: 2,
                },
                {
                    id: ilosRows.ilosExternalRates[1].id,
                    rateControlName: undefined,
                    rateDateStart: undefined,
                    rateDateEnd: undefined,
                    position: 3,
                },
            ])
        })

        it.each(['HEALTH_PLAN', 'EQRO'] as const)(
            'does not add ILOS keys to a %s revision even when ILOS rows exist',
            (contractSubmissionType) => {
                const contractRevision = mockContractRevision(
                    { contractSubmissionType },
                    ilosRows
                )

                const domainFormData =
                    contractFormDataToDomainModel(contractRevision)

                expect(domainFormData).not.toHaveProperty('isILOSRatesIncluded')
                expect(domainFormData).not.toHaveProperty('ilosDocuments')
                expect(domainFormData).not.toHaveProperty(
                    'ilosSupportingDocuments'
                )
                expect(domainFormData).not.toHaveProperty('ilosExternalRates')
            }
        )
    })

    describe('rateFormDataToDomainModel', () => {
        it('applies rate Medicaid population revision overrides', () => {
            const rateRevisionID = uuidv4()
            const rateRevision = mockRateRevision(undefined, {
                id: rateRevisionID,
                rateMedicaidPopulations: ['MEDICAID_ONLY'],
                revisionOverrides: [
                    {
                        id: uuidv4(),
                        createdAt: new Date(),
                        rateRevisionID,
                        rateMedicaidPopulations: [
                            'MEDICARE_MEDICAID_WITH_DSNP',
                        ],
                        rateMedicaidPopulationsOp: 'OVERRIDE',
                        rateDocuments: [],
                        supportingDocuments: [],
                    },
                ],
            })

            const domainFormData = rateFormDataToDomainModel(rateRevision)

            expect(domainFormData.rateMedicaidPopulations).toEqual([
                'MEDICARE_MEDICAID_WITH_DSNP',
            ])
        })

        it('clears rate Medicaid population overrides in stripped reads', () => {
            const rateRevisionID = uuidv4()
            const rateRevision = mockRateRevision(undefined, {
                id: rateRevisionID,
                rateMedicaidPopulations: ['MEDICAID_ONLY'],
                revisionOverrides: [
                    {
                        id: uuidv4(),
                        createdAt: new Date('2026-01-01'),
                        rateRevisionID,
                        rateMedicaidPopulations: [
                            'MEDICARE_MEDICAID_WITH_DSNP',
                        ],
                        rateMedicaidPopulationsOp: 'OVERRIDE',
                        rateDocuments: [],
                        supportingDocuments: [],
                    },
                    {
                        id: uuidv4(),
                        createdAt: new Date('2026-01-02'),
                        rateRevisionID,
                        rateMedicaidPopulations: [],
                        rateMedicaidPopulationsOp: 'CLEAR_OVERRIDE',
                        rateDocuments: [],
                        supportingDocuments: [],
                    },
                ],
            })

            const domainRevision =
                strippedRateRevisionToDomainModel(rateRevision)

            expect(domainRevision.formData.rateMedicaidPopulations).toEqual([
                'MEDICAID_ONLY',
            ])
        })
    })

    describe('getContractRateStatus', () => {
        // Using type coercion in these tests rather than creating revisions
        // we just care about unit testing different variations of submitInfo, updateInfo, and createdAt
        const contractWithUnorderedRevs: {
            revision: ContractRevisionTableWithFormData[]
            testDescription: string
            expectedResult: 'SUBMITTED' | 'DRAFT' | 'UNLOCKED' | 'RESUBMITTED'
        }[] = [
            {
                revision: [
                    {
                        createdAt: new Date(21, 3, 1),
                        submitInfo: {
                            id: uuidv4(),
                            updatedAt: new Date(),
                            updatedByID: 'someone',
                            updatedReason: 'submit',
                            updatedBy: {
                                id: 'someone',
                                createdAt: new Date(),
                                updatedAt: new Date(),
                                givenName: 'Bob',
                                familyName: 'Law',
                                email: 'boblaw@example.com',
                                role: 'STATE_USER',
                                divisionAssignment: null,
                                stateCode: 'OH',
                            },
                        },
                    } as ContractRevisionTableWithFormData,
                ],
                testDescription: 'only one revision exists with a submit info',
                expectedResult: 'SUBMITTED',
            },
            {
                revision: [
                    {
                        createdAt: new Date(21, 3, 1),
                    } as ContractRevisionTableWithFormData,
                ],
                testDescription:
                    'only one revision exists with not submit info',
                expectedResult: 'DRAFT',
            },
            {
                revision: [
                    {
                        createdAt: new Date(21, 4, 1),
                        unlockInfo: {
                            id: uuidv4(),
                            updatedAt: new Date(),
                            updatedByID: 'someone',
                            updatedReason: 'second unlock',
                            updatedBy: {
                                id: 'someone',
                                createdAt: new Date(),
                                updatedAt: new Date(),
                                givenName: 'Bob',
                                familyName: 'Law',
                                email: 'boblaw@example.com',
                                role: 'STATE_USER',
                                divisionAssignment: null,
                                stateCode: 'OH',
                            },
                        },
                    } as ContractRevisionTableWithFormData,
                    {
                        createdAt: new Date(21, 3, 1),
                        submitInfo: {
                            id: uuidv4(),
                            updatedAt: new Date(),
                            updatedByID: 'someone',
                            updatedReason: 'first resubmit',
                            updatedBy: {
                                id: 'someone',
                                createdAt: new Date(),
                                updatedAt: new Date(),
                                givenName: 'Bob',
                                familyName: 'Law',
                                email: 'boblaw@example.com',
                                role: 'STATE_USER',
                                divisionAssignment: null,
                                stateCode: 'OH',
                            },
                        },
                        unlockInfo: {
                            id: uuidv4(),
                            updatedAt: new Date(),
                            updatedByID: 'someone',
                            updatedReason: 'first unlock',
                            updatedBy: {
                                id: 'someone',
                                createdAt: new Date(),
                                updatedAt: new Date(),
                                givenName: 'Bob',
                                familyName: 'Law',
                                email: 'boblaw@example.com',
                                role: 'STATE_USER',
                                divisionAssignment: null,
                                stateCode: 'OH',
                            },
                        },
                    } as ContractRevisionTableWithFormData,
                    {
                        createdAt: new Date(21, 1, 1),
                        submitInfo: {
                            id: uuidv4(),
                            updatedAt: new Date(),
                            updatedByID: 'someone',
                            updatedReason: 'initial submit',
                            updatedBy: {
                                id: 'someone',
                                createdAt: new Date(),
                                updatedAt: new Date(),
                                givenName: 'Bob',
                                familyName: 'Law',
                                email: 'boblaw@example.com',
                                role: 'STATE_USER',
                                divisionAssignment: null,
                                stateCode: 'OH',
                            },
                        },
                    } as ContractRevisionTableWithFormData,
                ],
                testDescription:
                    'multiple revisions and latest revision has not been resubmitted',
                expectedResult: 'UNLOCKED',
            },
            {
                revision: [
                    {
                        createdAt: new Date(21, 2, 1),
                        submitInfo: {
                            id: uuidv4(),
                            updatedAt: new Date(),
                            updatedByID: 'someone',
                            updatedReason: 'resubmit submit',
                            updatedBy: {
                                id: 'someone',
                                createdAt: new Date(),
                                updatedAt: new Date(),
                                givenName: 'Bob',
                                familyName: 'Law',
                                email: 'boblaw@example.com',
                                role: 'STATE_USER',
                                divisionAssignment: null,
                                stateCode: 'OH',
                            },
                        },
                        unlockInfo: {
                            id: uuidv4(),
                            updatedAt: new Date(),
                            updatedByID: 'someone',
                            updatedReason: 'first unlock',
                            updatedBy: {
                                id: 'someone',
                                createdAt: new Date(),
                                updatedAt: new Date(),
                                givenName: 'Bob',
                                familyName: 'Law',
                                email: 'boblaw@example.com',
                                role: 'STATE_USER',
                                divisionAssignment: null,
                                stateCode: 'OH',
                            },
                        },
                    } as ContractRevisionTableWithFormData,
                    {
                        createdAt: new Date(21, 3, 1),
                        submitInfo: {
                            id: uuidv4(),
                            updatedAt: new Date(),
                            updatedByID: 'someone',
                            updatedReason: 'second resubmit',
                            updatedBy: {
                                id: 'someone',
                                createdAt: new Date(),
                                updatedAt: new Date(),
                                givenName: 'Bob',
                                familyName: 'Law',
                                email: 'boblaw@example.com',
                                role: 'STATE_USER',
                                divisionAssignment: null,
                                stateCode: 'OH',
                            },
                        },
                        unlockInfo: {
                            id: uuidv4(),
                            updatedAt: new Date(),
                            updatedByID: 'someone',
                            updatedReason: 'second Unlock',
                            updatedBy: {
                                id: 'someone',
                                createdAt: new Date(),
                                updatedAt: new Date(),
                                givenName: 'Bob',
                                familyName: 'Law',
                                email: 'boblaw@example.com',
                                role: 'STATE_USER',
                                divisionAssignment: null,
                                stateCode: 'OH',
                            },
                        },
                    } as ContractRevisionTableWithFormData,
                    {
                        createdAt: new Date(21, 1, 1),
                        submitInfo: {
                            id: uuidv4(),
                            updatedAt: new Date(),
                            updatedByID: 'someone',
                            updatedReason: 'initial submit',
                            updatedBy: {
                                id: 'someone',
                                createdAt: new Date(),
                                updatedAt: new Date(),
                                givenName: 'Bob',
                                familyName: 'Law',
                                email: 'boblaw@example.com',
                                role: 'STATE_USER',
                                divisionAssignment: null,
                                stateCode: 'OH',
                            },
                        },
                    } as ContractRevisionTableWithFormData,
                ],
                testDescription:
                    'multiple revisions and latest revision has been submitted',
                expectedResult: 'RESUBMITTED',
            },
        ]
        test.each(contractWithUnorderedRevs)(
            'correctly gets contract status from unordered revisions: $testDescription',
            ({ revision, expectedResult }) => {
                expect(getContractRateStatus(revision)).toEqual(expectedResult)
            }
        )
    })
})
