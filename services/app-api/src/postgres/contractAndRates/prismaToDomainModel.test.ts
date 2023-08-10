import { v4 as uuidv4 } from 'uuid'
import { createContractRevision } from '../../testHelpers'
import type { DraftContractRevisionTableWithRelations } from './prismaDraftContractHelpers'
import {
    contractFormDataToDomainModel,
    getContractStatus,
} from './prismaSharedContractRateHelpers'
import type { ContractRevisionTableWithRates } from './prismaSubmittedContractHelpers'

describe('prismaToDomainModel', () => {
    describe('contractFormDataToDomainModel', () => {
        it('correctly adds document categories to each document', () => {
            const contractRevision:
                | ContractRevisionTableWithRates
                | DraftContractRevisionTableWithRelations =
                createContractRevision()

            const domainFormData =
                contractFormDataToDomainModel(contractRevision)

            expect(domainFormData).toEqual(
                expect.objectContaining({
                    supportingDocuments: expect.arrayContaining([
                        expect.objectContaining({
                            name: 'contract supporting doc',
                            s3URL: 'fakeS3URL',
                            sha256: '2342fwlkdmwvw',
                            documentCategories: expect.arrayContaining([
                                'CONTRACT_RELATED',
                            ]),
                        }),
                        expect.objectContaining({
                            name: 'contract supporting doc 2',
                            s3URL: 'fakeS3URL',
                            sha256: '45662342fwlkdmwvw',
                            documentCategories: expect.arrayContaining([
                                'CONTRACT_RELATED',
                            ]),
                        }),
                    ]),
                    contractDocuments: expect.arrayContaining([
                        expect.objectContaining({
                            name: 'contract doc',
                            s3URL: 'fakeS3URL',
                            sha256: '8984234fwlkdmwvw',
                            documentCategories: expect.arrayContaining([
                                'CONTRACT',
                            ]),
                        }),
                    ]),
                })
            )
        })
    })

    describe('getContractStatus', () => {
        const contractWithUnorderedRevs: {
            revision: Pick<
                ContractRevisionTableWithRates,
                'createdAt' | 'submitInfo'
            >[]
            testDescription: string
            expectedResult: 'SUBMITTED' | 'DRAFT'
        }[] = [
            {
                revision: [
                    {
                        createdAt: new Date(21, 2, 1),
                        submitInfo: undefined,
                    },
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
                    },
                    {
                        createdAt: new Date(21, 1, 1),
                        submitInfo: undefined,
                    },
                ],
                testDescription: 'latest revision has been submitted',
                expectedResult: 'SUBMITTED',
            },
            {
                revision: [
                    {
                        createdAt: new Date(21, 2, 1),
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
                    },
                    {
                        createdAt: new Date(21, 3, 1),
                        submitInfo: undefined,
                    },
                    {
                        createdAt: new Date(21, 1, 1),
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
                    },
                ],
                testDescription: 'latest revisions has not been submitted',
                expectedResult: 'DRAFT',
            },
        ]
        test.each(contractWithUnorderedRevs)(
            'correctly gets contract status from unordered revisions: $testDescription',
            ({ revision, expectedResult }) => {
                expect(getContractStatus(revision)).toEqual(expectedResult)
            }
        )
    })
})
