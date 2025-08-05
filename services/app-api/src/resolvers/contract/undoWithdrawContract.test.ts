import {
    testCMSUser,
    testStateUser,
    createDBUsersWithFullData,
} from '../../testHelpers/userHelpers'
import {
    constructTestPostgresServer,
    defaultFloridaProgram,
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

    beforeAll(async () => {
        await createDBUsersWithFullData([stateUser, cmsUser])
    })

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
            },
            { user: stateUser }
        )

        const withdrawnContract = await withdrawTestContract(
            cmsServer,
            contract.id,
            'withdraw submission',
            { user: cmsUser }
        )

        expect(withdrawnContract.consolidatedStatus).toBe('WITHDRAWN')

        const undoWithdrawnContract = await undoWithdrawTestContract(
            cmsServer,
            contract.id,
            'Undo submission withdraw done in error.',
            { user: cmsUser }
        )

        const contractHistory = contractHistoryToDescriptions(
            undoWithdrawnContract
        )
        expect(undoWithdrawnContract.consolidatedStatus).toBe('RESUBMITTED')
        expect(contractHistory).toStrictEqual(
            expect.arrayContaining([
                'Initial submission',
                'CMS undoing submission submission withdrawal. Undo submission withdraw done in error.',
                'CMS undid submission withdrawal. Undo submission withdraw done in error.',
            ])
        )

        // expect withdraw again without errors
        must(
            await withdrawTestContract(
                cmsServer,
                undoWithdrawnContract.id,
                'withdraw again',
                { user: cmsUser }
            )
        )

        // expect undo withdraw again without errors
        must(
            await undoWithdrawTestContract(
                cmsServer,
                undoWithdrawnContract.id,
                'undo withdraw again',
                { user: cmsUser }
            )
        )

        // expect unlock without errors
        must(
            await unlockTestContract(
                cmsServer,
                undoWithdrawnContract.id,
                'unlock after undo withdraw',
                { user: cmsUser }
            )
        )

        // expect resubmit without errors
        must(
            await submitTestContract(
                stateServer,
                undoWithdrawnContract.id,
                'resubmit',
                { user: stateUser }
            )
        )

        // expect approval without errors
        must(
            await approveTestContract(
                cmsServer,
                undoWithdrawnContract.id,
                undefined
            )
        )
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

        const draftContract = await createAndUpdateTestContractWithRate(
            stateServer,
            undefined,
            { user: stateUser }
        )

        await addNewRateToTestContract(stateServer, draftContract, undefined, {
            user: stateUser,
        })

        const contract = await submitTestContract(
            stateServer,
            draftContract.id,
            undefined,
            { user: stateUser }
        )

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
            'withdraw submission',
            { user: cmsUser }
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
            'undo submission withdraw',
            { user: cmsUser }
        )

        const undoWithdrawnARate = await fetchTestRateById(cmsServer, rateAID)
        const undoWithdrawnBRate = await fetchTestRateById(cmsServer, rateBID)

        expect(undoWithdrawnContract.consolidatedStatus).toBe('RESUBMITTED')
        expect(undoWithdrawnARate.consolidatedStatus).toBe('RESUBMITTED')
        expect(undoWithdrawnBRate.consolidatedStatus).toBe('RESUBMITTED')

        // expect withdraw again without errors
        must(
            await withdrawTestContract(
                cmsServer,
                undoWithdrawnContract.id,
                'withdraw again',
                { user: cmsUser }
            )
        )

        // expect undo withdraw again without errors
        must(
            await undoWithdrawTestContract(
                cmsServer,
                undoWithdrawnContract.id,
                'undo withdraw again',
                { user: cmsUser }
            )
        )

        // expect unlock without errors
        must(
            await unlockTestContract(
                cmsServer,
                undoWithdrawnContract.id,
                'unlock after undo withdraw',
                { user: cmsUser }
            )
        )

        // expect resubmit without errors
        must(
            await submitTestContract(
                stateServer,
                undoWithdrawnContract.id,
                'resubmit',
                { user: stateUser }
            )
        )

        // expect approval without errors
        must(
            await approveTestContract(
                cmsServer,
                undoWithdrawnContract.id,
                undefined
            )
        )
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

        const draftContract = await createAndUpdateTestContractWithoutRates(
            stateServer,
            undefined,
            undefined,
            { user: stateUser }
        )

        if (!draftContract.draftRevision) {
            throw new Error(
                'Unexpected error, no draft revision on draft contract'
            )
        }

        must(
            await stateServer.executeOperation(
                {
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
                },
                {
                    contextValue: { user: stateUser },
                }
            )
        )

        const contractA = await submitTestContract(
            stateServer,
            draftContract.id,
            undefined,
            { user: stateUser }
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

        const draftContractB = await createAndUpdateTestContractWithoutRates(
            stateServer,
            undefined,
            undefined,
            { user: stateUser }
        )

        if (!draftContractB.draftRevision) {
            throw new Error(
                'Unexpected error, no draft revision on draft contract'
            )
        }

        // Link rate B to contract B
        must(
            await stateServer.executeOperation(
                {
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
                },
                {
                    contextValue: { user: stateUser },
                }
            )
        )

        // Submit contract B with linked rate B, now rate B will not be withdrawn
        await submitTestContract(stateServer, draftContractB.id, undefined, {
            user: stateUser,
        })

        const draftContractC = await createAndUpdateTestContractWithoutRates(
            stateServer,
            undefined,
            undefined,
            { user: stateUser }
        )

        if (!draftContractC.draftRevision) {
            throw new Error(
                'Unexpected error, no draft revision on draft contract'
            )
        }

        // Link rate C to contract C
        must(
            await stateServer.executeOperation(
                {
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
                },
                {
                    contextValue: { user: stateUser },
                }
            )
        )

        // // contract C is approved, which should not allow rate C to be withdrawn
        await submitTestContract(stateServer, draftContractC.id, undefined, {
            user: stateUser,
        })
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

        const draftContractB = await createAndUpdateTestContractWithoutRates(
            stateServer,
            undefined,
            undefined,
            { user: stateUser }
        )

        if (!draftContractB.draftRevision) {
            throw new Error(
                'Unexpected error, no draft revision on draft contract'
            )
        }

        await addNewRateToTestContract(stateServer, draftContractB, undefined, {
            user: stateUser,
        })

        const contractB = await submitTestContract(
            stateServer,
            draftContractB.id,
            undefined,
            { user: stateUser }
        )
        const rateBID = contractB.packageSubmissions[0].rateRevisions[0].rateID

        if (!rateBID) {
            throw new Error('Unexpected error, expecting rate B to exist')
        }

        const draftContractA = await createAndUpdateTestContractWithoutRates(
            stateServer,
            undefined,
            undefined,
            { user: stateUser }
        )

        if (!draftContractA.draftRevision) {
            throw new Error(
                'Unexpected error, no draft revision on draft contract'
            )
        }

        must(
            await stateServer.executeOperation(
                {
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
                },
                {
                    contextValue: { user: stateUser },
                }
            )
        )

        const contractA = await submitTestContract(
            stateServer,
            draftContractA.id,
            undefined,
            { user: stateUser }
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
            undefined,
            { user: stateUser }
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
                    ...testEmailConfig().dmcpSubmissionEmails,
                    ...testEmailConfig().oactEmails,
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
            },
            { user: stateUser }
        )

        const approvedContract = await createAndSubmitTestContract(
            stateServer,
            undefined,
            {
                submissionType: 'CONTRACT_ONLY',
            },
            { user: stateUser }
        )

        await approveTestContract(cmsServer, approvedContract.id)

        const unlockedContract = await createAndSubmitTestContract(
            stateServer,
            undefined,
            {
                submissionType: 'CONTRACT_ONLY',
            },
            { user: stateUser }
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
