import {
    iterableNonCMSUsersMockData,
    testCMSUser,
    testStateUser,
} from '../../testHelpers/userHelpers'
import { constructTestPostgresServer, defaultFloridaProgram } from '../../testHelpers/gqlHelpers'
import {
    createAndSubmitTestContractWithRate,
    createAndUpdateTestContractWithoutRates,
    createAndUpdateTestContractWithRate,
    fetchTestContractWithQuestions,
    submitTestContract,
    unlockTestContract,
} from '../../testHelpers/gqlContractHelpers'
import { withdrawTestRate } from '../../testHelpers/gqlRateHelpers'
import {
    WithdrawRateDocument,
    UpdateDraftContractRatesDocument,
    UnlockContractDocument,
    SubmitContractDocument,
} from '../../gen/gqlClient'
import { mockStoreThatErrors } from '../../testHelpers/storeHelpers'
import { expect } from 'vitest'
import { testEmailConfig, testEmailer } from '../../testHelpers/emailerHelpers'
import { packageName } from '@mc-review/hpp/build/healthPlanFormDataType/healthPlanFormData'
import { consoleLogFullData } from '../../testHelpers'

describe('withdrawRate', () => {
    it('can withdraw a rate without errors', async () => {
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

        const contract = await createAndSubmitTestContractWithRate(stateServer)
        const rateID = contract.packageSubmissions[0].rateRevisions[0].rateID
        const withdrawnRate = await withdrawTestRate(
            cmsServer,
            rateID,
            'Withdraw invalid rate'
        )

        // expect rate to contain contract in withdrawn join table
        expect(withdrawnRate.withdrawnFromContracts).toHaveLength(1)
        expect(withdrawnRate.withdrawnFromContracts).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    id: contract.id,
                }),
            ])
        )

        // expect withdrawn status
        expect(withdrawnRate).toEqual(
            expect.objectContaining({
                reviewStatus: 'WITHDRAWN',
                consolidatedStatus: 'WITHDRAWN',
            })
        )

        // expect correct actions
        expect(withdrawnRate.reviewStatusActions).toHaveLength(1)
        expect(withdrawnRate.reviewStatusActions).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    updatedAt: expect.any(Date),
                    updatedBy: expect.objectContaining({
                        role: cmsUser.role,
                        email: cmsUser.email,
                        givenName: cmsUser.givenName,
                        familyName: cmsUser.familyName,
                    }),
                    updatedReason: 'Withdraw invalid rate',
                    actionType: 'WITHDRAW',
                    rateID,
                }),
            ])
        )

        const contractWithWithdrawnRate = await fetchTestContractWithQuestions(
            stateServer,
            contract.id
        )
        expect(contractWithWithdrawnRate.withdrawnRates).toBeDefined()

        // expect contract to be RESUBMITTED
        expect(contractWithWithdrawnRate.consolidatedStatus).toEqual(
            'RESUBMITTED'
        )

        // expect contract to contain the withdrawn rate
        expect(contractWithWithdrawnRate?.withdrawnRates).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    id: rateID,
                }),
            ])
        )

        const packageSubmissions = contractWithWithdrawnRate.packageSubmissions

        // expect withdrawn rate is no longer in latest package submission
        expect(packageSubmissions[0].rateRevisions).not.toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    rateID,
                }),
            ])
        )

        // expect the withdrawn rate is on the previous packageSubmission
        expect(packageSubmissions[1].rateRevisions).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    rateID,
                }),
            ])
        )
    })

    it('can still unlock and resubmit after a rate has been withdrawn with expected packageSubmissions', async () => {
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

        const contract = await createAndSubmitTestContractWithRate(stateServer)
        const rateID = contract.packageSubmissions[0].rateRevisions[0].rateID
        await withdrawTestRate(cmsServer, rateID, 'Withdraw invalid rate')

        const unlockedContractResult = await cmsServer.executeOperation({
            query: UnlockContractDocument,
            variables: {
                input: {
                    contractID: contract.id,
                    unlockedReason: 'Test unlock after withdrawing rate',
                },
            },
        })

        expect(unlockedContractResult.errors).toBeUndefined()

        const resubmitContractResult = await stateServer.executeOperation({
            query: SubmitContractDocument,
            variables: {
                input: {
                    contractID: contract.id,
                    submittedReason: 'Resubmit contract',
                },
            },
        })

        expect(resubmitContractResult.errors).toBeUndefined()

        // expect withdrawn rate to still be in the withdrawn rate join table
        const resubmittedContract =
            resubmitContractResult.data?.submitContract.contract
        expect(resubmittedContract.withdrawnRates).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    id: rateID,
                }),
            ])
        )

        const packageSubmissions = resubmittedContract.packageSubmissions

        // expect withdrawn rate to be in the latest packageSubmissions.
        expect(packageSubmissions[0].rateRevisions).not.toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    rateID,
                }),
            ])
        )

        // expect the withdrawn rate is not on the previous packageSubmission
        expect(packageSubmissions[1].rateRevisions).not.toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    rateID,
                }),
            ])
        )

        // expect the withdrawn rate to be on the packageSubmission before the withdraw
        expect(packageSubmissions[2].rateRevisions).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    rateID,
                }),
            ])
        )
    })

    it('withdraws rate when linked to other contracts', async () => {
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

        const contractA = await createAndSubmitTestContractWithRate(stateServer)
        const rateID = contractA.packageSubmissions[0].rateRevisions[0].rateID

        const contractB =
            await createAndUpdateTestContractWithoutRates(stateServer)

        // link rate to contract B
        await stateServer.executeOperation({
            query: UpdateDraftContractRatesDocument,
            variables: {
                input: {
                    contractID: contractB.id,
                    lastSeenUpdatedAt: contractB.draftRevision?.updatedAt,
                    updatedRates: [
                        {
                            type: 'LINK',
                            rateID: rateID,
                        },
                    ],
                },
            },
        })

        await submitTestContract(stateServer, contractB.id)

        const withdrawnRate = await withdrawTestRate(
            cmsServer,
            rateID,
            'Withdraw invalid rate'
        )

        // expect rate to contain both contracts in withdrawn join table
        expect(withdrawnRate.withdrawnFromContracts).toHaveLength(2)
        expect(withdrawnRate.withdrawnFromContracts).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    id: contractB.id,
                }),
                expect.objectContaining({
                    id: contractA.id,
                }),
            ])
        )

        // expect review status action to be WITHDRAW
        expect(withdrawnRate.reviewStatusActions).toHaveLength(1)
        expect(withdrawnRate.reviewStatusActions).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    updatedAt: expect.any(Date),
                    updatedBy: expect.objectContaining({
                        role: cmsUser.role,
                        email: cmsUser.email,
                        givenName: cmsUser.givenName,
                        familyName: cmsUser.familyName,
                    }),
                    updatedReason: 'Withdraw invalid rate',
                    actionType: 'WITHDRAW',
                    rateID,
                }),
            ])
        )

        const contractAWithWithdrawnRate = await fetchTestContractWithQuestions(
            stateServer,
            contractA.id
        )
        expect(contractAWithWithdrawnRate.withdrawnRates).toBeDefined()

        // expect contract A to contain the withdrawn rate
        expect(contractAWithWithdrawnRate?.withdrawnRates).toHaveLength(1)
        expect(contractAWithWithdrawnRate?.withdrawnRates).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    id: rateID,
                }),
            ])
        )

        const contractBWithWithdrawnRate = await fetchTestContractWithQuestions(
            stateServer,
            contractB.id
        )
        expect(contractBWithWithdrawnRate.withdrawnRates).toBeDefined()

        // expect contract B to contain the withdrawn rate
        expect(contractBWithWithdrawnRate?.withdrawnRates).toHaveLength(1)
        expect(contractBWithWithdrawnRate?.withdrawnRates).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    id: rateID,
                }),
            ])
        )
    })

    it('does not update draft contract linked to withdrawn rate', async () => {
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

        // contractA is parent contract and submitted
        const contractA = await createAndSubmitTestContractWithRate(stateServer)
        const rateID = contractA.packageSubmissions[0].rateRevisions[0].rateID

        // contract B is linked and in draft
        const contractB =
            await createAndUpdateTestContractWithoutRates(stateServer)

        // contract C is linked, submitted, then unlocked
        const contractC =
            await createAndUpdateTestContractWithoutRates(stateServer)

        // link rate to contract B
        await stateServer.executeOperation({
            query: UpdateDraftContractRatesDocument,
            variables: {
                input: {
                    contractID: contractB.id,
                    lastSeenUpdatedAt: contractB.draftRevision?.updatedAt,
                    updatedRates: [
                        {
                            type: 'LINK',
                            rateID: rateID,
                        },
                    ],
                },
            },
        })

        // link rate to contract C, submit then unlock
        await stateServer.executeOperation({
            query: UpdateDraftContractRatesDocument,
            variables: {
                input: {
                    contractID: contractC.id,
                    lastSeenUpdatedAt: contractC.draftRevision?.updatedAt,
                    updatedRates: [
                        {
                            type: 'LINK',
                            rateID: rateID,
                        },
                    ],
                },
            },
        })
        await submitTestContract(stateServer, contractC.id)
        await unlockTestContract(
            cmsServer,
            contractC.id,
            'unlock to make updates'
        )
        const withdrawnRate = await withdrawTestRate(
            cmsServer,
            rateID,
            'Withdraw invalid rate'
        )

        // expect rate to contain contract in withdrawn join table
        expect(withdrawnRate.withdrawnFromContracts).toHaveLength(1)
        expect(withdrawnRate.withdrawnFromContracts).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    id: contractA.id,
                }),
            ])
        )

        // expect withdrawn status
        expect(withdrawnRate).toEqual(
            expect.objectContaining({
                reviewStatus: 'WITHDRAWN',
                consolidatedStatus: 'WITHDRAWN',
            })
        )

        // expect correct actions
        expect(withdrawnRate.reviewStatusActions).toHaveLength(1)
        expect(withdrawnRate.reviewStatusActions).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    updatedAt: expect.any(Date),
                    updatedBy: expect.objectContaining({
                        role: cmsUser.role,
                        email: cmsUser.email,
                        givenName: cmsUser.givenName,
                        familyName: cmsUser.familyName,
                    }),
                    updatedReason: 'Withdraw invalid rate',
                    actionType: 'WITHDRAW',
                    rateID,
                }),
            ])
        )

        const contractAWithWithdrawnRate = await fetchTestContractWithQuestions(
            stateServer,
            contractA.id
        )
        expect(contractAWithWithdrawnRate.withdrawnRates).toHaveLength(1)

        // expect contract A to be RESUBMITTED
        expect(contractAWithWithdrawnRate.consolidatedStatus).toEqual(
            'RESUBMITTED'
        )

        // expect contract A to contain the withdrawn rate
        expect(contractAWithWithdrawnRate?.withdrawnRates).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    id: rateID,
                }),
            ])
        )

        const contractBResult = await fetchTestContractWithQuestions(
            stateServer,
            contractB.id
        )
        // expect no withdrawn rates
        expect(contractBResult.withdrawnRates).toHaveLength(0)

        // expect contract B to be DRAFT
        expect(contractBResult.consolidatedStatus).toEqual('DRAFT')

        //expect contract B to still contain withdrawn rate in DraftRates
        expect(contractBResult?.draftRates).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    id: rateID,
                    consolidatedStatus: 'WITHDRAWN',
                }),
            ])
        )

        const contractCResult = await fetchTestContractWithQuestions(
            stateServer,
            contractC.id
        )
        // expect no withdrawn rates
        expect(contractCResult.withdrawnRates).toHaveLength(0)

        // expect contract B to be DRAFT
        expect(contractCResult.consolidatedStatus).toEqual('UNLOCKED')

        //expect contract B to still contain withdrawn rate in DraftRates
        expect(contractCResult?.draftRates).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    id: rateID,
                    consolidatedStatus: 'WITHDRAWN',
                }),
            ])
        )
    })
    it('sends an email to state contacts when a rate is withdrawn', async () => {
        const emailConfig = testEmailConfig()
        const mockEmailer = testEmailer(emailConfig)
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

        const contract = await createAndSubmitTestContractWithRate(stateServer)
        const rateID = contract.packageSubmissions[0].rateRevisions[0].rateID
        const rateName = contract.packageSubmissions[0].rateRevisions[0].formData.rateCertificationName
        const stateReceiverEmails = contract.packageSubmissions[0].contractRevision.formData.stateContacts.map(
            (contact) => contact.email
        )
        const contractName = packageName(
            contract.stateCode,
            contract.stateNumber,
            contract.packageSubmissions[0].contractRevision.formData.programIDs,
            [defaultFloridaProgram()]
        )

        await withdrawTestRate(cmsServer, rateID, 'Withdraw invalid rate')

        expect(mockEmailer.sendEmail).toHaveBeenNthCalledWith(
            1,
            expect.objectContaining({
                subject: expect.stringContaining(`${rateName} was withdrawn`),
                sourceEmail: emailConfig.emailSource,
                toAddresses: expect.arrayContaining(
                    Array.from(stateReceiverEmails)
                ),
                bodyHTML: expect.stringContaining(contractName),
            })
        )
    })
})

describe('withdrawRate invalid status handling', () => {
    it("returns error if rate is in invalid status' to withdraw", async () => {
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
        const draftContract =
            await createAndUpdateTestContractWithRate(stateServer)

        const rateID = draftContract.draftRates?.[0].id as string
        const contractID = draftContract.id

        const failedWithdrawDraftRate = await cmsServer.executeOperation({
            query: WithdrawRateDocument,
            variables: {
                input: {
                    rateID,
                    updatedReason: 'Withdraw draft rate',
                },
            },
        })

        // expect error for attempting to withdraw a draft rate
        expect(failedWithdrawDraftRate.errors?.[0]).toBeDefined()
        expect(failedWithdrawDraftRate.errors?.[0].message).toBe(
            'Attempted to withdraw rate with wrong status. Rate: DRAFT, Parent contract: DRAFT'
        )

        await submitTestContract(stateServer, contractID)
        await unlockTestContract(cmsServer, draftContract.id, 'Unlock contract')

        const failedWithdrawUnlockedRate = await cmsServer.executeOperation({
            query: WithdrawRateDocument,
            variables: {
                input: {
                    rateID,
                    updatedReason: 'Withdraw unlocked rate',
                },
            },
        })

        // expect error for attempting to withdraw an unlocked rate
        expect(failedWithdrawUnlockedRate.errors?.[0]).toBeDefined()
        expect(failedWithdrawUnlockedRate.errors?.[0].message).toBe(
            'Attempted to withdraw rate with wrong status. Rate: UNLOCKED, Parent contract: UNLOCKED'
        )

        await submitTestContract(stateServer, contractID, 'Resubmit')

        const withdrawnRateResult = await cmsServer.executeOperation({
            query: WithdrawRateDocument,
            variables: {
                input: {
                    rateID,
                    updatedReason: 'Withdraw submitted rate',
                },
            },
        })

        const withdrawnRate = withdrawnRateResult.data?.withdrawRate.rate

        // expect rate to be withdrawn with no errors
        expect(withdrawnRateResult.errors).toBeUndefined()
        expect(withdrawnRate).toEqual(
            expect.objectContaining({
                reviewStatus: 'WITHDRAWN',
                consolidatedStatus: 'WITHDRAWN',
            })
        )

        const failedWithdrawWithdrawnRate = await cmsServer.executeOperation({
            query: WithdrawRateDocument,
            variables: {
                input: {
                    rateID,
                    updatedReason: 'Withdraw already withdrawn rate',
                },
            },
        })

        // expect error for attempting to withdraw a withdrawn rate
        expect(failedWithdrawWithdrawnRate.errors?.[0]).toBeDefined()
        expect(failedWithdrawWithdrawnRate.errors?.[0].message).toBe(
            'Attempted to withdraw rate with wrong status. Rate: WITHDRAWN, Parent contract: RESUBMITTED'
        )
    })

    it('returns and error when rate is not found', async () => {
        const stateUser = testStateUser()
        const cmsUser = testCMSUser()
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
        })

        const failedWithdrawWithdrawnRate = await cmsServer.executeOperation({
            query: WithdrawRateDocument,
            variables: {
                input: {
                    rateID: 'not-a-valid-rate',
                    updatedReason: 'This rate does not exist',
                },
            },
        })

        // expect error for attempting to withdraw a rate that is not found
        expect(failedWithdrawWithdrawnRate.errors?.[0]).toBeDefined()
        expect(failedWithdrawWithdrawnRate.errors?.[0].message).toContain(
            'PRISMA ERROR: Cannot find rate with id: not-a-valid-rate'
        )
    })

    it('returns and error when withdraw rate failed in postgres', async () => {
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
            store: {
                withdrawRate: mockStoreThatErrors().withdrawRate,
            },
        })

        const contract = await createAndSubmitTestContractWithRate(stateServer)
        const rateID = contract.packageSubmissions[0].rateRevisions[0].rateID
        const failedWithdrawWithdrawnRate = await cmsServer.executeOperation({
            query: WithdrawRateDocument,
            variables: {
                input: {
                    rateID,
                    updatedReason: 'This rate does not exist',
                },
            },
        })

        // expect error for attempting to withdraw rate in postgres
        expect(failedWithdrawWithdrawnRate.errors?.[0]).toBeDefined()
        expect(failedWithdrawWithdrawnRate.errors?.[0].message).toBe(
            'Failed to withdraw rate message: UNEXPECTED_EXCEPTION: This error came from the generic store with errors mock'
        )
    })

    it.each(iterableNonCMSUsersMockData)(
        'returns an error when $userRole attempts to withdraw a rate',
        async ({ mockUser }) => {
            const stateUser = testStateUser()
            const stateServer = await constructTestPostgresServer({
                context: {
                    user: stateUser,
                },
            })
            const server = await constructTestPostgresServer({
                context: {
                    user: mockUser(),
                },
            })

            const contract =
                await createAndSubmitTestContractWithRate(stateServer)
            const rateID =
                contract.packageSubmissions[0].rateRevisions[0].rateID

            const failedWithdrawDraftRate = await server.executeOperation({
                query: WithdrawRateDocument,
                variables: {
                    input: {
                        rateID,
                        updatedReason: 'Withdraw draft rate',
                    },
                },
            })

            // expect error when withdrawing rate as an unauthorized user.
            expect(failedWithdrawDraftRate.errors?.[0]).toBeDefined()
            expect(failedWithdrawDraftRate.errors?.[0].message).toBe(
                'user not authorized to withdraw a rate'
            )
        }
    )
})
