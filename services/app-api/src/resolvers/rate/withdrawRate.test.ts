import {
    iterableNonCMSUsersMockData,
    testCMSUser,
    testStateUser,
} from '../../testHelpers/userHelpers'
import { constructTestPostgresServer } from '../../testHelpers/gqlHelpers'
import {
    createAndSubmitTestContractWithRate,
    createAndUpdateTestContractWithRate,
    submitTestContract,
    unlockTestContract,
} from '../../testHelpers/gqlContractHelpers'
import { WithdrawRateDocument } from '../../gen/gqlClient'
import { mockStoreThatErrors } from '../../testHelpers/storeHelpers'

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

        const withdrawnRateResult = await cmsServer.executeOperation({
            query: WithdrawRateDocument,
            variables: {
                input: {
                    rateID: rateID,
                    updatedReason: 'Withdraw invalid rate',
                },
            },
        })

        const withdrawnRate = withdrawnRateResult.data?.withdrawRate.rate

        // expect no errors
        expect(withdrawnRateResult.errors).toBeUndefined()

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
    })
})

describe('withdrawRate invalid status handling', () => {
    const stateUser = testStateUser()
    const cmsUser = testCMSUser()

    it('returns error if rate is in invalid status to withdraw', async () => {
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
            'Attempted to withdraw rate with wrong status: DRAFT'
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
            'Attempted to withdraw rate with wrong status: UNLOCKED'
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
            'Attempted to withdraw rate with wrong status: WITHDRAWN'
        )
    })

    it('returns and error when rate is not found', async () => {
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
