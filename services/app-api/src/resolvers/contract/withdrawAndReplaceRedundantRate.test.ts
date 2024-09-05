import { constructTestPostgresServer } from '../../testHelpers/gqlHelpers'
import { testS3Client } from '../../../../app-web/src/testHelpers/s3Helpers'
import WITHDRAW_REPLACE_RATE from 'app-graphql/src/mutations/withdrawAndReplaceRedundantRate.graphql'
import { testAdminUser, testCMSUser } from '../../testHelpers/userHelpers'
import {
    createAndSubmitTestContractWithRate,
    createAndUpdateTestContractWithRate,
    fetchTestContract,
    linkRateToDraftContract,
    submitTestContract,
    unlockTestContract,
    updateTestContractToReplaceRate,
} from '../../testHelpers/gqlContractHelpers'
import { type ApolloServer } from 'apollo-server-lambda'
import { fetchTestRateById, must } from '../../testHelpers'
import { type ContractRevision } from '../../gen/gqlServer'
import { type HealthPlanFormDataType } from '@mc-review/hpp'
import { withdrawRateInsideTransaction } from '../../postgres/contractAndRates'
import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'
import type { WithdrawDateArgsType } from '../../postgres/contractAndRates/withdrawRate'

// Setup function for testing withdraw and replace rate
// returns a the target contractID and ids for the child rate to be withdrawn and the replacement
const setupWithdrawRateTestData = async (
    stateServer: ApolloServer,
    contractOverrides?: Partial<HealthPlanFormDataType>
): Promise<{
    contractID: string
    replacementRateID: string
    withdrawnRateID: string
}> => {
    // submit two contracts with rates
    const contract1 = await createAndSubmitTestContractWithRate(
        stateServer,
        contractOverrides
    )
    const contract2 = await createAndSubmitTestContractWithRate(stateServer)

    // contract 1 is the target contract, prepare to withdraw and replace rate
    const withdrawnRateID =
        contract1.packageSubmissions[0].rateRevisions[0].rateID
    if (!withdrawnRateID) {
        throw Error('Not getting expected data for contract with rates')
    }

    const replacementRateID =
        contract2.packageSubmissions[0].rateRevisions[0].rateID
    if (!replacementRateID) {
        throw Error('Not getting expected data for contract with rates')
    }
    return {
        contractID: contract1.id,
        replacementRateID,
        withdrawnRateID,
    }
}
describe('withdrawAndReplaceRedundantRate', () => {
    const mockS3 = testS3Client()
    const adminUser = testAdminUser()
    const cmsUser = testCMSUser()

    it('results in the expected contract package changes - unlinks withdrawn rate, links replacement rate', async () => {
        const stateServer = await constructTestPostgresServer({
            s3Client: mockS3,
        })
        const adminServer = await constructTestPostgresServer({
            context: {
                user: adminUser,
            },
            s3Client: mockS3,
        })

        const { contractID, replacementRateID, withdrawnRateID } =
            await setupWithdrawRateTestData(stateServer)

        const confirmTestContract = await fetchTestContract(
            adminServer,
            contractID
        )

        // Confirm shape of data before withdraw is as expected
        expect(confirmTestContract.packageSubmissions).toHaveLength(1)
        expect(confirmTestContract.status).toBe('SUBMITTED')
        expect(
            confirmTestContract.packageSubmissions[0].rateRevisions
        ).toHaveLength(1)

        // replace rate on contract 1 with linked rate from contract 2
        const replaceReason = 'Admin has to clean things up'
        await updateTestContractToReplaceRate(adminServer, {
            contractID: contractID,
            replaceReason,
            replacementRateID: replacementRateID,
            withdrawnRateID,
        })

        const refetchContract1 = await fetchTestContract(
            adminServer,
            contractID
        )

        // Check unlock and resubmit logs are correct on both target contract and the latest packageSubmission
        expect(refetchContract1.packageSubmissions).toHaveLength(2)
        expect(refetchContract1.status).toBe('RESUBMITTED')
        expect(
            refetchContract1.packageSubmissions[0].submitInfo.updatedReason
        ).toBe(replaceReason)
        expect(
            refetchContract1.packageSubmissions[0].submitInfo.updatedBy.email
        ).toBe(adminUser.email)
        expect(
            refetchContract1.packageSubmissions[0].contractRevision.unlockInfo
                ?.updatedReason
        ).toBe(replaceReason)
        expect(
            refetchContract1.packageSubmissions[0].contractRevision.unlockInfo
                ?.updatedBy.email
        ).toBe(adminUser.email)

        // Check that rate data is correct for latest submission
        expect(
            refetchContract1.packageSubmissions[0].rateRevisions[0].rateID
        ).not.toBe(withdrawnRateID)
        expect(
            refetchContract1.packageSubmissions[0].rateRevisions[0].rateID
        ).toBe(replacementRateID)
        // check that only one rate is attached to latest submission
        expect(
            refetchContract1.packageSubmissions[0].rateRevisions
        ).toHaveLength(1)
    })

    it('withdraws rate, logs correct withdrawInfo', async () => {
        const stateServer = await constructTestPostgresServer({
            s3Client: mockS3,
        })
        const adminServer = await constructTestPostgresServer({
            context: {
                user: adminUser,
            },
            s3Client: mockS3,
        })

        const { contractID, replacementRateID, withdrawnRateID } =
            await setupWithdrawRateTestData(stateServer)

        const replaceReason = 'Admin has to replace a redundant rate'
        await updateTestContractToReplaceRate(adminServer, {
            contractID: contractID,
            replaceReason,
            replacementRateID: replacementRateID,
            withdrawnRateID,
        })

        const withdrawnRate = await fetchTestRateById(
            adminServer,
            withdrawnRateID
        )

        expect(withdrawnRate.withdrawInfo).toBeTruthy()
        expect(withdrawnRate.withdrawInfo?.updatedReason).toBe(replaceReason)
        const relatedContracts: ContractRevision[] =
            withdrawnRate.packageSubmissions
                ? withdrawnRate.packageSubmissions[0].contractRevisions
                : []
        expect(relatedContracts).toHaveLength(0) // withdrawn rate should be detached entirely from contracts
        // TODO add assertion checking the review status
    })

    it('returns forbidden error for non-admin users', async () => {
        const stateServer = await constructTestPostgresServer({
            s3Client: mockS3,
        })
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
            s3Client: mockS3,
        })

        const { contractID, replacementRateID, withdrawnRateID } =
            await setupWithdrawRateTestData(stateServer)

        const replaceReason = 'Admin has to do it!'
        const cmsResult = await cmsServer.executeOperation({
            query: WITHDRAW_REPLACE_RATE,
            variables: {
                input: {
                    contractID,
                    withdrawnRateID,
                    replacementRateID,
                    replaceReason,
                },
            },
        })

        const stateResult = await stateServer.executeOperation({
            query: WITHDRAW_REPLACE_RATE,
            variables: {
                input: {
                    contractID,
                    withdrawnRateID,
                    replacementRateID,
                    replaceReason,
                },
            },
        })

        expect(cmsResult.errors).toBeDefined()
        expect(stateResult.errors).toBeDefined()
    })

    it('returns error if the contract or individual rates are not currently submitted', async () => {
        const stateServer = await constructTestPostgresServer({
            s3Client: mockS3,
        })
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
            s3Client: mockS3,
        })
        const adminServer = await constructTestPostgresServer({
            context: {
                user: adminUser,
            },
            s3Client: mockS3,
        })

        const contract1 = await createAndSubmitTestContractWithRate(stateServer)
        const contract1ThatIsUnlocked = await unlockTestContract(
            cmsServer,
            contract1.id,
            'Unlock reason'
        )
        const contractWithReplacementRate =
            await createAndSubmitTestContractWithRate(stateServer)

        const replaceReason = 'Admin has to do it!'
        const adminResult = await adminServer.executeOperation({
            query: WITHDRAW_REPLACE_RATE,
            variables: {
                input: {
                    contractID: contract1ThatIsUnlocked.id,
                    withdrawnRateID:
                        contract1ThatIsUnlocked.packageSubmissions[0]
                            .rateRevisions[0].rateID,
                    replacementRateID:
                        contractWithReplacementRate.packageSubmissions[0]
                            .rateRevisions[0].rateID,
                    replaceReason,
                },
            },
        })
        expect(adminResult.errors).toBeDefined()
    })

    it('returns error if called on already withdrawn rate', async () => {
        // Set up function to withdraw arte using prisma level function - we don't have standalone resolver for this
        const withdrawRateOnDemand = async (args: WithdrawDateArgsType) => {
            const { rateID, withdrawnByUserID, withdrawReason } = args
            const client = await sharedTestPrismaClient()

            return must(
                await withdrawRateInsideTransaction(client, {
                    rateID,
                    withdrawnByUserID,
                    withdrawReason,
                })
            )
        }

        const stateServer = await constructTestPostgresServer({
            s3Client: mockS3,
        })
        const adminServer = await constructTestPostgresServer({
            context: {
                user: adminUser,
            },
            s3Client: mockS3,
        })

        const originalContract =
            await createAndSubmitTestContractWithRate(stateServer)
        const contractWithReplacementRate =
            await createAndSubmitTestContractWithRate(stateServer)
        const rateRevOnOriginalContract =
            originalContract.packageSubmissions[0].rateRevisions[0]

        // manually withdraw the rate early
        await withdrawRateOnDemand({
            rateID: rateRevOnOriginalContract.rateID,
            withdrawnByUserID: adminUser.id,
            withdrawReason: 'Withdraw this rate early for sake of the test',
        })

        const replaceReason = 'Try to withdraw already withdrawn rate'
        const withdrawRateResult = await adminServer.executeOperation({
            query: WITHDRAW_REPLACE_RATE,
            variables: {
                input: {
                    contractID: originalContract.id,
                    withdrawnRateID: rateRevOnOriginalContract.rateID,
                    replacementRateID:
                        contractWithReplacementRate.packageSubmissions[0]
                            .rateRevisions[0].rateID,
                    replaceReason,
                },
            },
        })
        expect(withdrawRateResult.errors).toBeDefined()
    })

    it('returns error if called on linked rate', async () => {
        const stateServer = await constructTestPostgresServer({
            s3Client: mockS3,
        })
        const adminServer = await constructTestPostgresServer({
            context: {
                user: adminUser,
            },
            s3Client: mockS3,
        })

        const firstContractRateRevision = (
            await createAndSubmitTestContractWithRate(stateServer)
        ).packageSubmissions[0].rateRevisions[0]

        // submit a contract with linked rate
        const secondContractWithLinkedRate =
            await createAndUpdateTestContractWithRate(stateServer)
        await linkRateToDraftContract(
            stateServer,
            secondContractWithLinkedRate.id,
            firstContractRateRevision.rateID
        )
        await submitTestContract(
            stateServer,
            secondContractWithLinkedRate.id,
            'submit contract with a linked rate'
        )

        const thirdContractWithReplacementRate =
            await createAndSubmitTestContractWithRate(stateServer)

        const replaceReason = 'Try to withdraw a linked rate'
        const withdrawRateResult = await adminServer.executeOperation({
            query: WITHDRAW_REPLACE_RATE,
            variables: {
                input: {
                    contractID: secondContractWithLinkedRate.id,
                    withdrawnRateID: firstContractRateRevision.rateID,
                    replacementRateID:
                        thirdContractWithReplacementRate.packageSubmissions[0]
                            .rateRevisions[0].rateID,
                    replaceReason,
                },
            },
        })
        expect(withdrawRateResult.errors).toBeDefined()
    })

    it('returns error if called on child rate that was linked to another submission', async () => {
        const stateServer = await constructTestPostgresServer({
            s3Client: mockS3,
        })
        const adminServer = await constructTestPostgresServer({
            context: {
                user: adminUser,
            },
            s3Client: mockS3,
        })

        const firstContractRateRevision = (
            await createAndSubmitTestContractWithRate(stateServer)
        ).packageSubmissions[0].rateRevisions[0]

        // submit a contract with linked rate
        const secondContractWithLinkedRate =
            await createAndUpdateTestContractWithRate(stateServer)
        await linkRateToDraftContract(
            stateServer,
            secondContractWithLinkedRate.id,
            firstContractRateRevision.rateID
        )
        await submitTestContract(
            stateServer,
            secondContractWithLinkedRate.id,
            'submit contract with a linked rate'
        )

        const thirdContractWithReplacementRate =
            await createAndSubmitTestContractWithRate(stateServer)

        const replaceReason =
            'Try to withdraw a child rate linked to another submission'
        const withdrawRateResult = await adminServer.executeOperation({
            query: WITHDRAW_REPLACE_RATE,
            variables: {
                input: {
                    contractID: firstContractRateRevision.id,
                    withdrawnRateID: firstContractRateRevision.rateID,
                    replacementRateID:
                        thirdContractWithReplacementRate.packageSubmissions[0]
                            .rateRevisions[0].rateID,
                    replaceReason,
                },
            },
        })
        expect(withdrawRateResult.errors).toBeDefined()
    })
})
