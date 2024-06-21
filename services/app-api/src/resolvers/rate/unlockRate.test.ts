import { constructTestPostgresServer } from '../../testHelpers/gqlHelpers'
import UNLOCK_RATE from '../../../../app-graphql/src/mutations/unlockRate.graphql'
import { testCMSUser } from '../../testHelpers/userHelpers'
import { expectToBeDefined } from '../../testHelpers/assertionHelpers'
import { testLDService } from '../../testHelpers/launchDarklyHelpers'
import { createSubmitAndUnlockTestRate } from '../../testHelpers/gqlRateHelpers'
import { createAndSubmitTestContractWithRate } from '../../testHelpers/gqlContractHelpers'
import { testS3Client } from '../../../../app-web/src/testHelpers/s3Helpers'

describe(`unlockRate`, () => {
    const ldService = testLDService({
        'rate-edit-unlock': true,
    })
    const cmsUser = testCMSUser()
    const mockS3 = testS3Client()

    it('changes rate status to UNLOCKED and creates a new draft revision with unlock info', async () => {
        const stateServer = await constructTestPostgresServer({
            ldService,
            s3Client: mockS3,
        })
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
            ldService,
            s3Client: mockS3,
        })

        // Create and unlock a rate
        const updatedRate = await createSubmitAndUnlockTestRate(
            stateServer,
            cmsServer
        )

        expect(updatedRate.status).toBe('UNLOCKED')

        if (!updatedRate.draftRevision) {
            throw new Error('no draftrate')
        }

        if (!updatedRate.draftRevision.unlockInfo) {
            throw new Error('no unlockinfo')
        }

        expect(updatedRate.draftRevision.unlockInfo.updatedReason).toBe(
            'test unlock'
        )
    })

    it('returns status error if rate is actively being edited in draft', async () => {
        const stateServer = await constructTestPostgresServer({
            ldService,
            s3Client: mockS3,
        })
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
            ldService,
            s3Client: mockS3,
        })

        // Create a rate
        const rate = await createSubmitAndUnlockTestRate(stateServer, cmsServer)

        // Try to unlock the rate again
        const unlockResult2 = await cmsServer.executeOperation({
            query: UNLOCK_RATE,
            variables: {
                input: {
                    rateID: rate.id,
                    unlockedReason: 'Super duper good reason.',
                },
            },
        })

        expectToBeDefined(unlockResult2.errors)
        expect(unlockResult2.errors[0].message).toBe(
            'Attempted to unlock rate with wrong status'
        )
    })

    it('returns unauthorized error for state user', async () => {
        const stateServer = await constructTestPostgresServer({
            ldService,
            s3Client: mockS3,
        })

        const contract = await createAndSubmitTestContractWithRate(stateServer)
        // Create a rate
        const rate = contract.packageSubmissions[0].rateRevisions[0]

        // Unlock the rate
        const unlockResult = await stateServer.executeOperation({
            query: UNLOCK_RATE,
            variables: {
                input: {
                    rateID: rate.id,
                    unlockedReason: 'Super duper good reason.',
                },
            },
        })

        expectToBeDefined(unlockResult.errors)
        expect(unlockResult.errors[0].message).toBe(
            'user not authorized to unlock rate'
        )
    })
})
