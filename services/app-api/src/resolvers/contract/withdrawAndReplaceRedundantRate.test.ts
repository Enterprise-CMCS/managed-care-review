import { constructTestPostgresServer } from '../../testHelpers/gqlHelpers'
import { testS3Client } from 'app-web/src/testHelpers/s3Helpers'

import { testAdminUser } from '../../testHelpers/userHelpers'
import {
    createAndSubmitTestContractWithRate,
    fetchTestContract,
    updateTestContractToReplaceRate,
} from '../../testHelpers/gqlContractHelpers'
import { type ApolloServer } from 'apollo-server-lambda'
import { fetchTestRateById } from '../../testHelpers'
import { type ContractRevision } from '../../gen/gqlServer'

// Setup function for testing withdraw and replace rate
// returns a the target contractID and ids for the child rate to be withdrawn and the replacement
const setupWithdrawRateTestData = async (
    stateServer: ApolloServer
): Promise<{
    contractID: string
    replacementRateID: string
    withdrawnRateID: string
}> => {
    // submit two contracts with rates
    const contract1 = await createAndSubmitTestContractWithRate(stateServer)
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
            refetchContract1.packageSubmissions[0].submitInfo.updatedBy
        ).toBe(adminUser.email)
        expect(
            refetchContract1.packageSubmissions[0].contractRevision.unlockInfo
                ?.updatedReason
        ).toBe(replaceReason)
        expect(
            refetchContract1.packageSubmissions[0].contractRevision.unlockInfo
                ?.updatedBy
        ).toBe(adminUser.email)

        // Check that rate data is correct for latest submission
        expect(
            refetchContract1.packageSubmissions[0].rateRevisions[0].rateID
        ).not.toBe(withdrawnRateID)
        expect(
            refetchContract1.packageSubmissions[0].rateRevisions[0].rateID
        ).toBe(replacementRateID)
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

    it.todo(
        'does not change or re-validate contract data, just replace rate as is'
    )
    // old form data
    // double check submit contract logic
    // make sure submit can't fail with old style rate programs - make sure its still there - its not getting stripped away
    it.todo('returns forbidden error for non-admin users')
    it.todo(
        'returns error if the contract or individual rates are not currently submitted'
    )
})
