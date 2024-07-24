import { constructTestPostgresServer } from '../../testHelpers/gqlHelpers'
import { testS3Client } from 'app-web/src/testHelpers/s3Helpers'

import { testAdminUser } from '../../testHelpers/userHelpers'
import {
    createAndSubmitTestContractWithRate,
    fetchTestContract,
    updateTestContractToReplaceRate,
} from '../../testHelpers/gqlContractHelpers'

describe('withdrawAndReplaceRedundantRate', () => {
    const mockS3 = testS3Client()
    const adminUser = testAdminUser()

    it('results in the expected contract package changes - unlinks withdrawn rate, links replacement rate', async () => {
        const stateServer = await constructTestPostgresServer({
            s3Client: mockS3,
        })
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: adminUser,
            },
            s3Client: mockS3,
        })
        // submit two contracts with rates
        const contract1 = await createAndSubmitTestContractWithRate(stateServer)
        const contract2 = await createAndSubmitTestContractWithRate(stateServer)

        // we are going to replace a rate on contract 1
        // first identify rate that is going to be withdrawn and rate that will be replacement
        const withdrawnRateID =
            contract1.packageSubmissions[0].rateRevisions[0].rateID
        if (!withdrawnRateID) {
            throw Error('Not getting expected data for contract with rates')
        }

        const replacementRate = contract2.packageSubmissions[0].rateRevisions[0]
        if (!replacementRate) {
            throw Error('Not getting expected data for ontract with rates')
        }

        // replace rate on contract 1 with linked rate from contract 2
        const replaceReason = 'Admin has to clean things up'
        await updateTestContractToReplaceRate(cmsServer, {
            contractID: contract1.id,
            replaceReason,
            replacementRateID: replacementRate.id,
            withdrawnRateID,
        })

        const refetchContract1 = await fetchTestContract(
            cmsServer,
            contract1.id
        )

        // Check unlock and resubmit logs are correct
        expect(refetchContract1.packageSubmissions).toHaveLength(2)
        expect(refetchContract1.status).toBe('RESUBMITTED')
        expect(
            refetchContract1.packageSubmissions[0].submitInfo.updatedReason
        ).toBe(replaceReason)
        expect(
            refetchContract1.packageSubmissions[0].submitInfo.updatedBy
        ).toBe(adminUser.id)
        expect(
            refetchContract1.packageSubmissions[0].contractRevision.unlockInfo
                ?.updatedReason
        ).toBe(replaceReason)
        expect(
            refetchContract1.packageSubmissions[0].contractRevision.unlockInfo
                ?.updatedBy
        ).toBe(adminUser.id)

        // Check that rate data is correct for latest submission
        expect(
            refetchContract1.packageSubmissions[0].rateRevisions[0].rateID
        ).not.toBe(withdrawnRateID)
        expect(
            refetchContract1.packageSubmissions[0].rateRevisions[0].rateID
        ).toBe(replacementRate.id)
    })

    it.todo('withdraws rate and adjusts review status')
    it.todo('does not re-validate contract data to replace rate')
    // old form data
    // double check submit contract logic
    // make sure submit can't fail with old style rate programs - make sure its still there - its not getting stripped away
    it.todo('returns forbidden error for non-admin users')
    it.todo(
        'returns error if the contract or individual rates are not currently submitted'
    )
})
