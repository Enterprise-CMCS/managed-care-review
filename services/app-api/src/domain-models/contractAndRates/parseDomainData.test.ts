import {
    DraftContractTableWithRelations,
    DraftContractRevisionTableWithRelations,
    ContractTableWithRelations,
    ContractRevisionTableWithRelations,
} from '../../postgres/prismaTypes'
import {
    parseDraftContract,
    parseDraftContractRevision,
    parseContractWithHistory,
} from './parseDomainData'
import { v4 as uuidv4 } from 'uuid'
import {
    createContractData,
    createContractRevision,
    createDraftContractData,
} from '../../testHelpers/'

describe('parseDomainData', () => {
    describe('parseDraftContract', () => {
        it('can parse valid draft domain data with no errors', () => {
            const draftData = createDraftContractData()
            const validatedDraft = parseDraftContract(draftData)
            expect(validatedDraft).not.toBeInstanceOf(Error)
        })

        const draftContractWithInvalidData: {
            contract: DraftContractTableWithRelations
            testDescription: string
        }[] = [
            {
                contract: createDraftContractData({
                    revisions: [],
                }),
                testDescription: 'no contract revisions',
            },
            {
                contract: createDraftContractData({
                    stateNumber: 0,
                    revisions: [
                        createContractRevision() as DraftContractRevisionTableWithRelations,
                    ],
                }),
                testDescription: 'undefined stateNumber',
            },
            {
                contract: createDraftContractData({
                    stateCode: undefined,
                    revisions: [
                        createContractRevision() as DraftContractRevisionTableWithRelations,
                    ],
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
                        }) as DraftContractRevisionTableWithRelations,
                    ],
                }),
                testDescription: 'invalid contract status of submitted',
            },
        ]
        test.each(draftContractWithInvalidData)(
            'parseDraftContract returns an error when draft contract data is invalid: $testDescription',
            ({ contract }) => {
                expect(parseDraftContract(contract)).toBeInstanceOf(Error)
            }
        )
    })
    describe('parseDraftContractRevision', () => {
        it('cant parse valid contract revision with no errors', () => {
            const contractRevision =
                createContractRevision() as DraftContractRevisionTableWithRelations
            expect(
                parseDraftContractRevision(contractRevision)
            ).not.toBeInstanceOf(Error)
        })
        const draftContractRevisionsWithInvalidData: {
            revision: DraftContractRevisionTableWithRelations
            testDescription: string
        }[] = [
            {
                revision: createContractRevision({
                    submissionType: undefined,
                }) as DraftContractRevisionTableWithRelations,
                testDescription: 'invalid submissionType',
            },
            {
                revision: createContractRevision({
                    submissionDescription: undefined,
                }) as DraftContractRevisionTableWithRelations,
                testDescription: 'invalid submissionDescription',
            },
            {
                revision: createContractRevision({
                    contractType: undefined,
                }) as DraftContractRevisionTableWithRelations,
                testDescription: 'invalid contractType',
            },
            {
                revision: createContractRevision({
                    managedCareEntities: undefined,
                }) as DraftContractRevisionTableWithRelations,
                testDescription: 'invalid managedCareEntities',
            },
        ]
        test.each(draftContractRevisionsWithInvalidData)(
            'parseDraftContractRevision returns an error when draft contract data is invalid: $testDescription',
            ({ revision }) => {
                expect(parseDraftContractRevision(revision)).toBeInstanceOf(
                    Error
                )
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
            contract: ContractTableWithRelations
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
                                        name: 'some data',
                                        rateType: null,
                                        rateCapitationType: null,
                                        rateDateStart: null,
                                        rateDateEnd: null,
                                        rateDateCertified: null,
                                        amendmentEffectiveDateStart: null,
                                        amendmentEffectiveDateEnd: null,
                                        rateProgramIDs: [],
                                        rateCertificationName: null,
                                        actuaryCommunicationPreference: null,
                                    },
                                },
                            ],
                        }) as ContractRevisionTableWithRelations,
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
