import { v4 as uuidv4 } from 'uuid'
import {
    createContractData,
    createContractRevision,
    createDraftContractData,
} from '../../testHelpers/'
import { parseContractWithHistory } from './parseContractWithHistory'
import type { ContractTableFullPayload } from './prismaSubmittedContractHelpers'

describe('parseDomainData', () => {
    describe('parseDraftContract', () => {
        it('can parse valid draft domain data with no errors', () => {
            const draftData = createDraftContractData()
            const validatedDraft = parseContractWithHistory(draftData)
            expect(validatedDraft).not.toBeInstanceOf(Error)
        })

        const draftContractWithInvalidData: {
            contract: ContractTableFullPayload
            testDescription: string
        }[] = [
            {
                contract: createDraftContractData({
                    stateNumber: 0,
                    revisions: [createContractRevision()],
                }),
                testDescription: 'undefined stateNumber',
            },
            {
                contract: createDraftContractData({
                    stateCode: undefined,
                    revisions: [createContractRevision()],
                }),
                testDescription: 'invalid stateCode',
            },
            {
                contract: createDraftContractData({
                    stateCode: undefined,
                    revisions: [
                        createContractRevision({
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
        it('cant parse valid contract revision with no errors', () => {
            const contractRevision = createContractData()
            expect(
                parseContractWithHistory(contractRevision)
            ).not.toBeInstanceOf(Error)
        })
        const draftContractRevisionsWithInvalidData: {
            contract: ContractTableFullPayload
            testDescription: string
        }[] = [
            {
                contract: createContractData({
                    revisions: [
                        createContractRevision({
                            submissionType: undefined,
                        }),
                    ],
                }),
                testDescription: 'invalid submissionType',
            },
            {
                contract: createContractData({
                    revisions: [
                        createContractRevision({
                            submissionDescription: undefined,
                        }),
                    ],
                }),
                testDescription: 'invalid submissionDescription',
            },
            {
                contract: createContractData({
                    revisions: [
                        createContractRevision({
                            contractType: undefined,
                        }),
                    ],
                }),
                testDescription: 'invalid contractType',
            },
            {
                contract: createContractData({
                    revisions: [
                        createContractRevision({
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
        it('can parse valid contract domain data with no errors', () => {
            const contractData = createContractData()
            const validatedContract = parseContractWithHistory(contractData)
            expect(validatedContract).not.toBeInstanceOf(Error)
        })

        const contractRevisionsWithInvalidData: {
            contract: ContractTableFullPayload
            testDescription: string
        }[] = [
            {
                contract: createContractData({
                    stateNumber: 0,
                }),
                testDescription: 'invalid stateNumber',
            },
            {
                contract: createContractData({
                    stateCode: undefined,
                }),
                testDescription: 'undefined stateCode',
            },
            {
                contract: createContractData({
                    revisions: [
                        createContractRevision({
                            rateRevisions: [
                                {
                                    rateRevisionID: uuidv4(),
                                    contractRevisionID: uuidv4(),
                                    validAfter: new Date(),
                                    validUntil: null,
                                    updatedAt: new Date(),
                                    isRemoval: false,
                                    rateRevision: {
                                        id: uuidv4(),
                                        rateID: 'Rate ID',
                                        createdAt: new Date(),
                                        updatedAt: new Date(),
                                        submitInfoID: null,
                                        submitInfo: null,
                                        unlockInfo: null,
                                        unlockInfoID: null,
                                        rateType: null,
                                        rateCapitationType: null,
                                        rateDateStart: null,
                                        rateDateEnd: null,
                                        rateDateCertified: null,
                                        rateDocuments: [],
                                        certifyingActuaryContacts: [],
                                        addtlActuaryContacts: [],
                                        supportingDocuments: [],
                                        amendmentEffectiveDateStart: null,
                                        amendmentEffectiveDateEnd: null,
                                        rateProgramIDs: [],
                                        rateCertificationName: null,
                                        actuaryCommunicationPreference: null,
                                    },
                                },
                            ],
                        }) as ContractTableFullPayload['revisions'][0],
                    ],
                }),
                testDescription: 'unsubmitted rate',
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
