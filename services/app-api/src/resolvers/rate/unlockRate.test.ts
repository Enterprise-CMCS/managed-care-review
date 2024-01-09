import {
    constructTestPostgresServer,
    createAndSubmitTestHealthPlanPackage,
} from '../../testHelpers/gqlHelpers'
import UNLOCK_RATE from '../../../../app-graphql/src/mutations/unlockRate.graphql'
import { testCMSUser } from '../../testHelpers/userHelpers'
import { latestFormData } from '../../testHelpers/healthPlanPackageHelpers'

describe(`unlockRate`, () => {
    const cmsUser = testCMSUser()

    it('returns a new rate with unlock info assigned', async () => {
        const stateServer = await constructTestPostgresServer()
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
        })

        // First, create a new package with rates
        const submission =
            await createAndSubmitTestHealthPlanPackage(stateServer)
        const attachedRate = latestFormData(submission).rateInfos[0]
        expect(attachedRate.id).toBeDefined()

        // Unlock a rate
        const unlockResult = await cmsServer.executeOperation({
            query: UNLOCK_RATE,
            variables: {
                input: {
                    rateID: attachedRate.id,
                    unlockedReason: 'Super duper good reason.',
                },
            },
        })

        expect(unlockResult.errors).toBeUndefined()
    })
})
