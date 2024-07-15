import { v4 as uuidv4 } from 'uuid'
import { mockContractRevision, mockContractData } from '../../testHelpers/'
import { parseContractWithHistory } from './parseContractWithHistory'
import type { ContractTableFullPayload } from './prismaFullContractRateHelpers'

describe('parseDomainData', () => {
    describe('parseDraftContract', () => {
        const draftContract = mockContractData()
        it('can parse valid draft domain data with no errors', () => {
            const validatedDraft = parseContractWithHistory(draftContract)
            expect(validatedDraft).not.toBeInstanceOf(Error)
        })

        const draftContractWithInvalidData: {
            contract: ContractTableFullPayload
            testDescription: string
        }[] = [
            {
                contract: mockContractData({
                    stateNumber: 0,
                    revisions: [mockContractRevision()],
                }),
                testDescription: 'undefined stateNumber',
            },
            {
                contract: mockContractData({
                    stateCode: undefined,
                    revisions: [mockContractRevision()],
                }),
                testDescription: 'invalid stateCode',
            },
            {
                contract: mockContractData({
                    stateCode: undefined,
                    revisions: [
                        mockContractRevision(draftContract, {
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
                        }),
                    ],
                }),
                testDescription: 'invalid contract status of submitted',
            },
        ]
        test.each(draftContractWithInvalidData)(
            'parseDraftContract returns an error when draft contract data is invalid: $testDescription',
            ({ contract }) => {
                expect(parseContractWithHistory(contract)).toBeInstanceOf(Error)
            }
        )
    })
    describe('parseDraftContractRevision', () => {
        const contract = mockContractData()

        it('cant parse valid contract revision with no errors', () => {
            expect(parseContractWithHistory(contract)).not.toBeInstanceOf(Error)
        })
        const draftContractRevisionsWithInvalidData: {
            contract: ContractTableFullPayload
            testDescription: string
        }[] = [
            {
                contract: mockContractData({
                    revisions: [
                        mockContractRevision(contract, {
                            submissionType: undefined,
                        }),
                    ],
                }),
                testDescription: 'invalid submissionType',
            },
            {
                contract: mockContractData({
                    revisions: [
                        mockContractRevision(contract, {
                            submissionDescription: undefined,
                        }),
                    ],
                }),
                testDescription: 'invalid submissionDescription',
            },
            {
                contract: mockContractData({
                    revisions: [
                        mockContractRevision(contract, {
                            contractType: undefined,
                        }),
                    ],
                }),
                testDescription: 'invalid contractType',
            },
            {
                contract: mockContractData({
                    revisions: [
                        mockContractRevision(contract, {
                            managedCareEntities: undefined,
                        }),
                    ],
                }),
                testDescription: 'invalid managedCareEntities',
            },
        ]
        test.each(draftContractRevisionsWithInvalidData)(
            'parseDraftContractRevision returns an error when draft contract data is invalid: $testDescription',
            ({ contract: revision }) => {
                expect(parseContractWithHistory(revision)).toBeInstanceOf(Error)
            }
        )
    })
    describe('parseContractWithHistory', () => {
        const contract = mockContractData()
        it('can parse valid contract domain data with no errors', () => {
            const validatedContract = parseContractWithHistory(contract)
            expect(validatedContract).not.toBeInstanceOf(Error)
        })

        const contractRevisionsWithInvalidData: {
            contract: ContractTableFullPayload
            testDescription: string
        }[] = [
            {
                contract: mockContractData({
                    stateNumber: 0,
                }),
                testDescription: 'invalid stateNumber',
            },
            {
                contract: mockContractData({
                    stateCode: undefined,
                }),
                testDescription: 'undefined stateCode',
            },
        ]
        test.each(contractRevisionsWithInvalidData)(
            'parseContractWithHistory returns an error when contract data is invalid: $testDescription',
            ({ contract }) => {
                expect(parseContractWithHistory(contract)).toBeInstanceOf(Error)
            }
        )
    })
})
