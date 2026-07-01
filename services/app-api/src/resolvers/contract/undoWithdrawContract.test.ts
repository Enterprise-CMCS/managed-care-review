import { testCMSUser, testStateUser } from '../../testHelpers/userHelpers'
import {
    constructTestPostgresServer,
    defaultFloridaProgram,
    executeGraphQLOperation,
} from '../../testHelpers/gqlHelpers'
import {
    createAndUpdateTestContractWithoutRates,
    submitTestContract,
    withdrawTestContract,
    undoWithdrawTestContract,
    createAndUpdateTestContractWithRate,
    createAndSubmitTestContract,
    approveTestContract,
    contractHistoryToDescriptions,
    unlockTestContract,
    errorUndoWithdrawTestContract,
    createAndSubmitTestContractWithRate,
    createAndUpdateTestEQROContract,
} from '../../testHelpers/gqlContractHelpers'
import { fetchTestRateById, must } from '../../testHelpers'
import {
    addNewRateToTestContract,
    fetchTestIndexRatesStripped,
} from '../../testHelpers/gqlRateHelpers'
import {
    type RateFormDataInput,
    UpdateDraftContractRatesDocument,
} from '../../gen/gqlClient'
import { testEmailConfig, testEmailer } from '../../testHelpers/emailerHelpers'
import { testLDService } from '../../testHelpers/launchDarklyHelpers'
import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'

const testRateFormInputData = (): RateFormDataInput => ({
    rateType: 'AMENDMENT',
    rateCapitationType: 'RATE_RANGE',
    rateDateStart: '2024-01-01',
    rateDateEnd: '2025-01-01',
    rateDateCertified: '2024-01-01',
    amendmentEffectiveDateStart: '2024-02-01',
    amendmentEffectiveDateEnd: '2025-02-01',
    rateProgramIDs: [defaultFloridaProgram().id],
    deprecatedRateProgramIDs: [],
    rateDocuments: [
        {
            s3URL: 's3://bucketname/key/test1',
            name: 'updatedratedoc1.doc',
            sha256: 'foobar',
        },
    ],
    supportingDocuments: [],
    certifyingActuaryContacts: [
        {
            name: 'Foo Person',
            titleRole: 'Bar Job',
            email: 'foo@example.com',
            actuarialFirm: 'GUIDEHOUSE',
        },
    ],
    addtlActuaryContacts: [],
    actuaryCommunicationPreference: 'OACT_TO_ACTUARY',
})

describe('undoWithdrawContract', () => {
    const stateUser = testStateUser()
    const cmsUser = testCMSUser()
    it('can undo a contract-only submission withdrawal', async () => {
        const stateServer = await constructTestPostgresServer({
            context: {
                user: stateUser,
            },
        })

        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
        })

        const contract = await createAndSubmitTestContract(
            stateServer,
            undefined,
            {
                submissionType: 'CONTRACT_ONLY',
            }
        )

        const withdrawnContract = await withdrawTestContract(
            cmsServer,
            contract.id,
            'withdraw submission'
        )

        expect(withdrawnContract.consolidatedStatus).toBe('WITHDRAWN')

        const undoWithdrawnContract = await undoWithdrawTestContract(
            cmsServer,
            contract.id,
            'Undo submission withdraw done in error.'
        )

        const contractHistory = contractHistoryToDescriptions(
            undoWithdrawnContract
        )
        expect(undoWithdrawnContract.consolidatedStatus).toBe('RESUBMITTED')
        expect(undoWithdrawnContract.contractSubmissionType).toBe('HEALTH_PLAN')

        const prismaClient = await sharedTestPrismaClient()
        const contractTableRow = await prismaClient.contractTable.findUnique({
            where: { id: contract.id },
            select: {
                lastActionDate: true,
                reviewStatusActions: {
                    orderBy: { updatedAt: 'desc' },
                    take: 1,
                    select: { updatedAt: true, actionType: true },
                },
            },
        })
        expect(contractTableRow?.reviewStatusActions[0].actionType).toBe(
            'UNDER_REVIEW'
        )
        expect(contractTableRow?.lastActionDate).toEqual(
            contractTableRow?.reviewStatusActions[0].updatedAt
        )

        expect(contractHistory).toStrictEqual(
            expect.arrayContaining([
                'Initial submission',
                'CMS undoing submission withdrawal. Undo submission withdraw done in error.',
                'CMS undid submission withdrawal. Undo submission withdraw done in error.',
            ])
        )

        // expect withdraw again without errors
        must(
            await withdrawTestContract(
                cmsServer,
                undoWithdrawnContract.id,
                'withdraw again'
            )
        )

        // expect undo withdraw again without errors
        must(
            await undoWithdrawTestContract(
                cmsServer,
                undoWithdrawnContract.id,
                'undo withdraw again'
            )
        )

        // expect unlock without errors
        must(
            await unlockTestContract(
                cmsServer,
                undoWithdrawnContract.id,
                'unlock after undo withdraw'
            )
        )

        // expect resubmit without errors
        must(
            await submitTestContract(
                stateServer,
                undoWithdrawnContract.id,
                'resubmit'
            )
        )

        // expect approval without errors
        must(await approveTestContract(cmsServer, undoWithdrawnContract.id))
    })
    it('can undo a contract and rate submission withdrawal', async () => {
        const stateServer = await constructTestPostgresServer({
            context: {
                user: stateUser,
            },
        })

        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
        })

        const draftContract =
            await createAndUpdateTestContractWithRate(stateServer)

        await addNewRateToTestContract(stateServer, draftContract)

        const contract = await submitTestContract(stateServer, draftContract.id)

        const rateAID = contract.packageSubmissions[0].rateRevisions[0].rateID
        const rateBID = contract.packageSubmissions[0].rateRevisions[1].rateID

        if (!rateAID || !rateBID) {
            throw new Error(
                'Unexpected error: Rate not found on contract and rate draft submission.'
            )
        }

        const withdrawnContract = await withdrawTestContract(
            cmsServer,
            contract.id,
            'withdraw submission'
        )

        const withdrawnARate = await fetchTestRateById(cmsServer, rateAID)
        const withdrawnBRate = await fetchTestRateById(cmsServer, rateBID)

        // Expect contract and rates to be withdrawn
        expect(withdrawnContract.consolidatedStatus).toBe('WITHDRAWN')
        expect(withdrawnARate.consolidatedStatus).toBe('WITHDRAWN')
        expect(withdrawnBRate.consolidatedStatus).toBe('WITHDRAWN')

        const undoWithdrawnContract = await undoWithdrawTestContract(
            cmsServer,
            contract.id,
            'undo submission withdraw'
        )

        const undoWithdrawnARate = await fetchTestRateById(cmsServer, rateAID)
        const undoWithdrawnBRate = await fetchTestRateById(cmsServer, rateBID)

        expect(undoWithdrawnContract.consolidatedStatus).toBe('RESUBMITTED')
        expect(undoWithdrawnARate.consolidatedStatus).toBe('RESUBMITTED')
        expect(undoWithdrawnBRate.consolidatedStatus).toBe('RESUBMITTED')

        const prismaClient = await sharedTestPrismaClient()
        const contractTableRow = await prismaClient.contractTable.findUnique({
            where: { id: contract.id },
            select: {
                lastActionDate: true,
                reviewStatusActions: {
                    orderBy: { updatedAt: 'desc' },
                    take: 1,
                    select: { updatedAt: true, actionType: true },
                },
            },
        })
        const rateATableRow = await prismaClient.rateTable.findUnique({
            where: { id: rateAID },
            select: {
                lastActionDate: true,
                reviewStatusActions: {
                    orderBy: { updatedAt: 'desc' },
                    take: 1,
                    select: { updatedAt: true, actionType: true },
                },
            },
        })
        const rateBTableRow = await prismaClient.rateTable.findUnique({
            where: { id: rateBID },
            select: {
                lastActionDate: true,
                reviewStatusActions: {
                    orderBy: { updatedAt: 'desc' },
                    take: 1,
                    select: { updatedAt: true, actionType: true },
                },
            },
        })
        expect(contractTableRow?.reviewStatusActions[0].actionType).toBe(
            'UNDER_REVIEW'
        )
        expect(contractTableRow?.lastActionDate).toEqual(
            contractTableRow?.reviewStatusActions[0].updatedAt
        )
        expect(rateATableRow?.reviewStatusActions[0].actionType).toBe(
            'UNDER_REVIEW'
        )
        expect(rateATableRow?.lastActionDate).toEqual(
            rateATableRow?.reviewStatusActions[0].updatedAt
        )
        expect(rateBTableRow?.reviewStatusActions[0].actionType).toBe(
            'UNDER_REVIEW'
        )
        expect(rateBTableRow?.lastActionDate).toEqual(
            rateBTableRow?.reviewStatusActions[0].updatedAt
        )

        // expect withdraw again without errors
        must(
            await withdrawTestContract(
                cmsServer,
                undoWithdrawnContract.id,
                'withdraw again'
            )
        )

        // expect undo withdraw again without errors
        must(
            await undoWithdrawTestContract(
                cmsServer,
                undoWithdrawnContract.id,
                'undo withdraw again'
            )
        )

        // expect unlock without errors
        must(
            await unlockTestContract(
                cmsServer,
                undoWithdrawnContract.id,
                'unlock after undo withdraw'
            )
        )

        // expect resubmit without errors
        must(
            await submitTestContract(
                stateServer,
                undoWithdrawnContract.id,
                'resubmit'
            )
        )

        // expect approval without errors
        must(await approveTestContract(cmsServer, undoWithdrawnContract.id))
    })
    it('can undo a submission withdrawal that had linked child rates', async () => {
        const stateServer = await constructTestPostgresServer({
            context: {
                user: stateUser,
            },
        })

        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
        })

        const draftContract =
            await createAndUpdateTestContractWithoutRates(stateServer)

        if (!draftContract.draftRevision) {
            throw new Error(
                'Unexpected error, no draft revision on draft contract'
            )
        }

        must(
            await executeGraphQLOperation(stateServer, {
                query: UpdateDraftContractRatesDocument,
                variables: {
                    input: {
                        contractID: draftContract.id,
                        lastSeenUpdatedAt:
                            draftContract.draftRevision.updatedAt,
                        updatedRates: [
                            {
                                type: 'CREATE',
                                formData: testRateFormInputData(),
                            },
                            {
                                type: 'CREATE',
                                formData: testRateFormInputData(),
                            },
                            {
                                type: 'CREATE',
                                formData: testRateFormInputData(),
                            },
                        ],
                    },
                },
            })
        )

        const contractA = await submitTestContract(
            stateServer,
            draftContract.id
        )

        const rateAID = contractA.packageSubmissions[0].rateRevisions[0].rateID
        const rateBID = contractA.packageSubmissions[0].rateRevisions[1].rateID
        const rateCID = contractA.packageSubmissions[0].rateRevisions[2].rateID

        if (!rateAID) {
            throw new Error('Unexpected error, expecting rate to exist')
        }

        if (!rateBID) {
            throw new Error('Unexpected error, expecting rate to exist')
        }

        if (!rateCID) {
            throw new Error('Unexpected error, expecting rate to exist')
        }

        const draftContractB =
            await createAndUpdateTestContractWithoutRates(stateServer)

        if (!draftContractB.draftRevision) {
            throw new Error(
                'Unexpected error, no draft revision on draft contract'
            )
        }

        // Link rate B to contract B
        must(
            await executeGraphQLOperation(stateServer, {
                query: UpdateDraftContractRatesDocument,
                variables: {
                    input: {
                        contractID: draftContractB.id,
                        lastSeenUpdatedAt:
                            draftContractB.draftRevision.updatedAt,
                        updatedRates: [
                            {
                                type: 'LINK',
                                rateID: rateBID,
                            },
                        ],
                    },
                },
            })
        )

        // Submit contract B with linked rate B, now rate B will not be withdrawn
        await submitTestContract(stateServer, draftContractB.id)

        const draftContractC =
            await createAndUpdateTestContractWithoutRates(stateServer)

        if (!draftContractC.draftRevision) {
            throw new Error(
                'Unexpected error, no draft revision on draft contract'
            )
        }

        // Link rate C to contract C
        must(
            await executeGraphQLOperation(stateServer, {
                query: UpdateDraftContractRatesDocument,
                variables: {
                    input: {
                        contractID: draftContractC.id,
                        lastSeenUpdatedAt:
                            draftContractC.draftRevision.updatedAt,
                        updatedRates: [
                            {
                                type: 'LINK',
                                rateID: rateCID,
                            },
                        ],
                    },
                },
            })
        )

        // // contract C is approved, which should not allow rate C to be withdrawn
        await submitTestContract(stateServer, draftContractC.id)
        await approveTestContract(cmsServer, draftContractC.id)

        const withdrawnContractA = await withdrawTestContract(
            cmsServer,
            contractA.id,
            'withdraw submission'
        )

        let ratesStripped = await fetchTestIndexRatesStripped(
            cmsServer,
            contractA.stateCode,
            [rateAID, rateBID, rateCID]
        )

        let rateA = ratesStripped.edges.find(
            ({ node }) => node.id === rateAID
        )?.node
        let rateB = ratesStripped.edges.find(
            ({ node }) => node.id === rateBID
        )?.node
        let rateC = ratesStripped.edges.find(
            ({ node }) => node.id === rateCID
        )?.node

        if (!rateA) {
            throw new Error(
                `Unexpected error: Rate A was not found after withdrawing contract.`
            )
        }
        if (!rateB) {
            throw new Error(
                `Unexpected error: Rate B was not found after withdrawing contract.`
            )
        }
        if (!rateC) {
            throw new Error(
                `Unexpected error: Rate C was not found after withdrawing contract.`
            )
        }

        // Expect Contract A to be withdrawn
        expect(withdrawnContractA.consolidatedStatus).toBe('WITHDRAWN')

        // Expect Rate A to be withdrawn with Contract A
        expect(rateA.consolidatedStatus).toBe('WITHDRAWN')
        expect(rateA.parentContractID).toBe(withdrawnContractA.id)

        // Expect Rate B to be resubmitted with Contract B
        expect(rateB.consolidatedStatus).toBe('RESUBMITTED')
        expect(rateB.parentContractID).toBe(draftContractB.id)

        // Expect Rate C to be resubmitted with Contract C
        expect(rateC.consolidatedStatus).toBe('RESUBMITTED')
        expect(rateC.parentContractID).toBe(draftContractC.id)

        // Undo submission withdrawal
        const undoWithdrawnContractA = await undoWithdrawTestContract(
            cmsServer,
            contractA.id,
            'undo submission withdraw'
        )

        ratesStripped = await fetchTestIndexRatesStripped(
            cmsServer,
            contractA.stateCode,
            [rateAID, rateBID, rateCID]
        )

        rateA = ratesStripped.edges.find(
            ({ node }) => node.id === rateAID
        )?.node
        rateB = ratesStripped.edges.find(
            ({ node }) => node.id === rateBID
        )?.node
        rateC = ratesStripped.edges.find(
            ({ node }) => node.id === rateCID
        )?.node

        if (!rateA) {
            throw new Error(
                `Unexpected error: Rate A was not found after undo withdrawal.`
            )
        }
        if (!rateB) {
            throw new Error(
                `Unexpected error: Rate B was not found after undo withdrawal.`
            )
        }
        if (!rateC) {
            throw new Error(
                `Unexpected error: Rate C was not found after undo withdrawal.`
            )
        }

        // Expect contract A to be un-withdrawn
        expect(undoWithdrawnContractA.consolidatedStatus).toBe('RESUBMITTED')

        // Expect Rate A to be un-withdrawn with Contract A
        expect(rateA.consolidatedStatus).toBe('RESUBMITTED')
        expect(rateA.parentContractID).toBe(withdrawnContractA.id)

        // Expect Rate B to still be resubmitted with Contract B
        expect(rateB.consolidatedStatus).toBe('RESUBMITTED')
        expect(rateB.parentContractID).toBe(draftContractB.id)

        // Expect Rate C to still be resubmitted with Contract C
        expect(rateC.consolidatedStatus).toBe('RESUBMITTED')
        expect(rateC.parentContractID).toBe(draftContractC.id)
    })
    it('can undo a submission withdrawal that has linked rates', async () => {
        const stateServer = await constructTestPostgresServer({
            context: {
                user: stateUser,
            },
        })

        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
        })

        const draftContractB =
            await createAndUpdateTestContractWithoutRates(stateServer)

        if (!draftContractB.draftRevision) {
            throw new Error(
                'Unexpected error, no draft revision on draft contract'
            )
        }

        await addNewRateToTestContract(stateServer, draftContractB)

        const contractB = await submitTestContract(
            stateServer,
            draftContractB.id
        )
        const rateBID = contractB.packageSubmissions[0].rateRevisions[0].rateID

        if (!rateBID) {
            throw new Error('Unexpected error, expecting rate B to exist')
        }

        const draftContractA =
            await createAndUpdateTestContractWithoutRates(stateServer)

        if (!draftContractA.draftRevision) {
            throw new Error(
                'Unexpected error, no draft revision on draft contract'
            )
        }

        must(
            await executeGraphQLOperation(stateServer, {
                query: UpdateDraftContractRatesDocument,
                variables: {
                    input: {
                        contractID: draftContractA.id,
                        lastSeenUpdatedAt:
                            draftContractA.draftRevision.updatedAt,
                        updatedRates: [
                            {
                                type: 'LINK',
                                rateID: rateBID,
                            },
                        ],
                    },
                },
            })
        )

        const contractA = await submitTestContract(
            stateServer,
            draftContractA.id
        )

        const withdrawnContractA = await withdrawTestContract(
            cmsServer,
            contractA.id,
            'withdraw submission'
        )

        let rateB = await fetchTestRateById(cmsServer, rateBID)

        if (!rateB) {
            throw new Error(
                `Unexpected error: Rate B was not found after withdrawing contract.`
            )
        }

        // Expect Contract A to be withdrawn
        expect(withdrawnContractA.consolidatedStatus).toBe('WITHDRAWN')

        // Expect Rate B to be submitted with Contract B
        expect(rateB.consolidatedStatus).toBe('SUBMITTED')
        expect(rateB.parentContractID).toBe(draftContractB.id)

        // Undo submission withdrawal
        const undoWithdrawnContractA = await undoWithdrawTestContract(
            cmsServer,
            contractA.id,
            'undo submission withdraw'
        )

        rateB = await fetchTestRateById(cmsServer, rateBID)

        if (!rateB) {
            throw new Error(
                `Unexpected error: Rate B was not found after undo withdrawal.`
            )
        }

        // Expect contract A to be un-withdrawn
        expect(undoWithdrawnContractA.consolidatedStatus).toBe('RESUBMITTED')

        // Expect Rate B to still be submitted with Contract B
        expect(rateB.consolidatedStatus).toBe('SUBMITTED')
        expect(rateB.parentContractID).toBe(draftContractB.id)
    })

    it('sends email to state and CMS when submission is withdrawn', async () => {
        const emailConfig = testEmailConfig()
        const mockEmailer = testEmailer()
        const stateUser = testStateUser()
        const cmsUser = testCMSUser()
        const stateServer = await constructTestPostgresServer({
            context: {
                user: stateUser,
            },
        })

        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
            emailer: mockEmailer,
        })

        const contract = await createAndSubmitTestContractWithRate(
            stateServer,
            undefined
        )

        await withdrawTestContract(
            cmsServer,
            contract.id,
            'withdraw submission'
        )

        const unWithdrawnContract = await undoWithdrawTestContract(
            cmsServer,
            contract.id,
            'Undo submission withdraw'
        )

        const contractName =
            unWithdrawnContract.packageSubmissions[0].contractRevision
                .contractName

        const stateReceiverEmails =
            unWithdrawnContract.packageSubmissions[0].contractRevision.formData.stateContacts.map(
                (contact) => contact.email
            )

        const rateCertificationName =
            unWithdrawnContract.packageSubmissions[0].rateRevisions?.[0]
                .formData.rateCertificationName

        if (!rateCertificationName)
            throw new Error('Unexpected error: Expected rate to exist.')

        // Expect CMS emails contain correct recipients, contract and rate names
        expect(mockEmailer.sendEmail).toHaveBeenNthCalledWith(
            3,
            expect.objectContaining({
                subject: expect.stringContaining(
                    `${contractName} status update`
                ),
                sourceEmail: emailConfig.emailSource,
                toAddresses: expect.arrayContaining([
                    ...testEmailConfig().devReviewTeamEmails,
                    ...testEmailConfig().dmcpSubmissionEmails,
                    ...testEmailConfig().oactEmails,
                    ...testEmailConfig().dmcoEmails,
                ]),
                bodyHTML: expect.stringContaining(contractName),
            })
        )

        expect(mockEmailer.sendEmail).toHaveBeenNthCalledWith(
            3,
            expect.objectContaining({
                bodyHTML: expect.stringContaining(rateCertificationName),
            })
        )

        // Expect State emails contain correct recipients, contract and rate names
        expect(mockEmailer.sendEmail).toHaveBeenNthCalledWith(
            4,
            expect.objectContaining({
                subject: expect.stringContaining(
                    `${contractName} status update`
                ),
                sourceEmail: emailConfig.emailSource,
                toAddresses: expect.arrayContaining(stateReceiverEmails),
                bodyHTML: expect.stringContaining(contractName),
            })
        )

        expect(mockEmailer.sendEmail).toHaveBeenNthCalledWith(
            4,
            expect.objectContaining({
                bodyHTML: expect.stringContaining(contractName),
            })
        )
    })

    it('can undo withdraw EQRO contract', async () => {
        const stateServer = await constructTestPostgresServer({
            context: {
                user: stateUser,
            },
        })

        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
        })

        // At least one EQRO provision field true -> UNDER_REVIEW / SUBMITTED
        const draft = await createAndUpdateTestEQROContract(
            stateServer,
            undefined,
            {
                eqroNewContractor: true,
                eqroProvisionMcoNewOptionalActivity: true,
                eqroProvisionNewMcoEqrRelatedActivities: true,
                eqroProvisionChipEqrRelatedActivities: true,
                eqroProvisionMcoEqrOrRelatedActivities: null,
            }
        )

        const submittedContract = await submitTestContract(
            stateServer,
            draft.id
        )
        expect(submittedContract.consolidatedStatus).toBe('SUBMITTED')

        const withdrawnContract = await withdrawTestContract(
            cmsServer,
            submittedContract.id,
            'withdraw EQRO submission'
        )

        expect(withdrawnContract.consolidatedStatus).toBe('WITHDRAWN')

        const contractHistory = contractHistoryToDescriptions(withdrawnContract)
        expect(contractHistory).toStrictEqual(
            expect.arrayContaining([
                'Initial submission',
                'Withdraw submission. withdraw EQRO submission',
                'CMS withdrew the submission from review. withdraw EQRO submission',
            ])
        )

        const undoneContract = await undoWithdrawTestContract(
            cmsServer,
            withdrawnContract.id,
            'undo withdraw EQRO submission'
        )

        expect(undoneContract.consolidatedStatus).toBe('RESUBMITTED')

        const undoneHistory = contractHistoryToDescriptions(undoneContract)
        expect(undoneHistory).toStrictEqual(
            expect.arrayContaining([
                'Initial submission',
                'Withdraw submission. withdraw EQRO submission',
                'CMS withdrew the submission from review. withdraw EQRO submission',
                'CMS undoing submission withdrawal. undo withdraw EQRO submission',
                'CMS undid submission withdrawal. undo withdraw EQRO submission',
            ])
        )

        must(
            await unlockTestContract(
                cmsServer,
                undoneContract.id,
                'unlock EQRO after undo'
            )
        )
        const resubmittedAfterUndo = must(
            await submitTestContract(
                stateServer,
                undoneContract.id,
                'resubmit EQRO after undo'
            )
        )
        expect(resubmittedAfterUndo.consolidatedStatus).toBe('RESUBMITTED')

        const afterUndoHistory =
            contractHistoryToDescriptions(resubmittedAfterUndo)
        expect(afterUndoHistory).toStrictEqual(
            expect.arrayContaining([
                'Initial submission',
                'Withdraw submission. withdraw EQRO submission',
                'CMS withdrew the submission from review. withdraw EQRO submission',
                'CMS undoing submission withdrawal. undo withdraw EQRO submission',
                'CMS undid submission withdrawal. undo withdraw EQRO submission',
                'unlock EQRO after undo',
                'resubmit EQRO after undo',
            ])
        )
    })

    it('can undo withdraw EQRO or CHIP-only HEALTH_PLAN contract with NOT_SUBJECT_TO_REVIEW status', async () => {
        const stateServer = await constructTestPostgresServer({
            context: { user: stateUser },
            ldService: testLDService({
                'chip-submission-automation': true,
            }),
        })
        const cmsServer = await constructTestPostgresServer({
            context: { user: cmsUser },
        })

        // EQRO: all-false provision fields trigger NOT_SUBJECT_TO_REVIEW on submit
        const eqroDraft = await createAndUpdateTestEQROContract(
            stateServer,
            undefined,
            {
                eqroNewContractor: false,
                eqroProvisionMcoNewOptionalActivity: false,
                eqroProvisionNewMcoEqrRelatedActivities: false,
                eqroProvisionChipEqrRelatedActivities: false,
                eqroProvisionMcoEqrOrRelatedActivities: null,
            }
        )
        const eqroSubmitted = await submitTestContract(
            stateServer,
            eqroDraft.id
        )
        expect(eqroSubmitted.contractSubmissionType).toBe('EQRO')
        expect(eqroSubmitted.consolidatedStatus).toBe('NOT_SUBJECT_TO_REVIEW')

        const chipDraft = await createAndUpdateTestContractWithoutRates(
            stateServer,
            undefined,
            {
                submissionType: 'CONTRACT_ONLY',
                populationCovered: 'CHIP',
                federalAuthorities: ['TITLE_XXI'],
            }
        )
        const chipSubmitted = await submitTestContract(
            stateServer,
            chipDraft.id
        )
        expect(chipSubmitted.contractSubmissionType).toBe('HEALTH_PLAN')
        expect(chipSubmitted.consolidatedStatus).toBe('NOT_SUBJECT_TO_REVIEW')

        const eqroWithdrawn = await withdrawTestContract(
            cmsServer,
            eqroSubmitted.id,
            'withdraw EQRO submission'
        )
        expect(eqroWithdrawn.consolidatedStatus).toBe('WITHDRAWN')

        const chipWithdrawn = await withdrawTestContract(
            cmsServer,
            chipSubmitted.id,
            'withdraw CHIP submission'
        )
        expect(chipWithdrawn.consolidatedStatus).toBe('WITHDRAWN')

        const eqroUndone = await undoWithdrawTestContract(
            cmsServer,
            eqroWithdrawn.id,
            'undo withdraw EQRO submission'
        )
        expect(eqroUndone.consolidatedStatus).toBe('NOT_SUBJECT_TO_REVIEW')

        const chipUndone = await undoWithdrawTestContract(
            cmsServer,
            chipWithdrawn.id,
            'undo withdraw CHIP submission'
        )
        expect(chipUndone.consolidatedStatus).toBe('NOT_SUBJECT_TO_REVIEW')

        const prismaClient = await sharedTestPrismaClient()
        const eqroTableRow = await prismaClient.contractTable.findUnique({
            where: { id: eqroSubmitted.id },
            select: {
                lastActionDate: true,
                reviewStatusActions: {
                    orderBy: { updatedAt: 'desc' },
                    take: 1,
                    select: { updatedAt: true, actionType: true },
                },
            },
        })
        const chipTableRow = await prismaClient.contractTable.findUnique({
            where: { id: chipSubmitted.id },
            select: {
                lastActionDate: true,
                reviewStatusActions: {
                    orderBy: { updatedAt: 'desc' },
                    take: 1,
                    select: { updatedAt: true, actionType: true },
                },
            },
        })

        // Undo-withdraw restores NOT_SUBJECT_TO_REVIEW by appending a new
        // review action, and lastActionDate should point at that action.
        expect(eqroTableRow?.reviewStatusActions[0].actionType).toBe(
            'NOT_SUBJECT_TO_REVIEW'
        )
        expect(eqroTableRow?.lastActionDate).toEqual(
            eqroTableRow?.reviewStatusActions[0].updatedAt
        )
        expect(chipTableRow?.reviewStatusActions[0].actionType).toBe(
            'NOT_SUBJECT_TO_REVIEW'
        )
        expect(chipTableRow?.lastActionDate).toEqual(
            chipTableRow?.reviewStatusActions[0].updatedAt
        )
    })
})

describe('undoWithdrawContract error handling', () => {
    it('returns an error if contract is in incorrect status', async () => {
        const stateUser = testStateUser()
        const cmsUser = testCMSUser()
        const stateServer = await constructTestPostgresServer({
            context: {
                user: stateUser,
            },
        })

        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
        })

        const submittedContract = await createAndSubmitTestContract(
            stateServer,
            undefined,
            {
                submissionType: 'CONTRACT_ONLY',
            }
        )

        const approvedContract = await createAndSubmitTestContract(
            stateServer,
            undefined,
            {
                submissionType: 'CONTRACT_ONLY',
            }
        )

        await approveTestContract(cmsServer, approvedContract.id)

        const unlockedContract = await createAndSubmitTestContract(
            stateServer,
            undefined,
            {
                submissionType: 'CONTRACT_ONLY',
            }
        )

        await unlockTestContract(
            cmsServer,
            unlockedContract.id,
            'unlock contract'
        )

        const submittedContractWithdrawErrors =
            await errorUndoWithdrawTestContract(
                cmsServer,
                submittedContract.id,
                'withdraw submission'
            )

        expect(submittedContractWithdrawErrors[0].message).toBe(
            'Attempted to undo a submission withdrawal with invalid contract status of SUBMITTED'
        )

        const approvedContractWithdrawErrors =
            await errorUndoWithdrawTestContract(
                cmsServer,
                approvedContract.id,
                'withdraw submission'
            )

        expect(approvedContractWithdrawErrors[0].message).toBe(
            'Attempted to undo a submission withdrawal with invalid contract status of APPROVED'
        )

        const unlockedContractWithdrawErrors =
            await errorUndoWithdrawTestContract(
                cmsServer,
                unlockedContract.id,
                'withdraw submission'
            )

        expect(unlockedContractWithdrawErrors[0].message).toBe(
            'Attempted to undo a submission withdrawal with invalid contract status of UNLOCKED'
        )
    })
})
