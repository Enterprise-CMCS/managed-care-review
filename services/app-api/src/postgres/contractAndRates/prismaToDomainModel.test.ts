import { v4 as uuidv4 } from 'uuid'
import { mockContractRevision } from '../../testHelpers'
import {
    getContractRateStatus,
    contractFormDataToDomainModel,
} from './prismaSharedContractRateHelpers'
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
                    } as ContractRevisionTableWithFormData,
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
                    } as ContractRevisionTableWithFormData,
                ],
                testDescription:
                    'multiple reivsions and latest revision has not been submitted',
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
