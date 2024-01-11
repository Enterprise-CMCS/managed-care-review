import {
    constructTestPostgresServer,
    createAndSubmitTestHealthPlanPackage,
} from '../../testHelpers/gqlHelpers'
import UNLOCK_RATE from '../../../../app-graphql/src/mutations/unlockRate.graphql'
import { testCMSUser } from '../../testHelpers/userHelpers'
import { latestFormData } from '../../testHelpers/healthPlanPackageHelpers'
import { expectToBeDefined } from '../../testHelpers/assertionHelpers'

describe(`unlockRate`, () => {
    const cmsUser = testCMSUser()

    it('changes rate status to UNLOCKED and creates a new draft revision with unlock info', async () => {
        const stateServer = await constructTestPostgresServer()
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
        })

        // Create a rate
        const submission =
            await createAndSubmitTestHealthPlanPackage(stateServer)
        const initialSubmitFormData = latestFormData(submission)
        const rateID = initialSubmitFormData.rateInfos[0].id
        expect(rateID).toBeDefined()

        // unlock rate
        const unlockedReason = 'Super duper good reason.'
        const unlockResult = await cmsServer.executeOperation({
            query: UNLOCK_RATE,
            variables: {
                input: {
                    rateID,
                    unlockedReason,
                },
            },
        })

        expect(unlockResult.errors).toBeUndefined()

        const updatedRate = unlockResult.data?.unlockRate.rate

        console.info(updatedRate)
        expect(updatedRate.status).toBe('UNLOCKED')
        expect(updatedRate.draftRevision).toBeDefined()
        expect(updatedRate.draftRevision.unlockInfo.updatedReason).toEqual(
            unlockedReason
        )
    })

    it('returns status error if rate is actively being edited in draft', async () => {
        const stateServer = await constructTestPostgresServer()
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
        })

        // Create a rate
        const submission =
            await createAndSubmitTestHealthPlanPackage(stateServer)
        const initialSubmitFormData = latestFormData(submission)
        const targetRateBeforeUnlock = initialSubmitFormData.rateInfos[0]
        expectToBeDefined(targetRateBeforeUnlock.id)

        // Unlock the rate once
        const unlockResult1 = await cmsServer.executeOperation({
            query: UNLOCK_RATE,
            variables: {
                input: {
                    rateID: targetRateBeforeUnlock.id,
                    unlockedReason: 'Super duper good reason.',
                },
            },
        })

        expect(unlockResult1.errors).toBeUndefined()

        // Try to unlock the rate again
        const unlockResult2 = await cmsServer.executeOperation({
            query: UNLOCK_RATE,
            variables: {
                input: {
                    rateID: targetRateBeforeUnlock.id,
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
        const stateServer = await constructTestPostgresServer()
        // Create a rate
        const submission =
            await createAndSubmitTestHealthPlanPackage(stateServer)
        const initialSubmitFormData = latestFormData(submission)
        const targetRateBeforeUnlock = initialSubmitFormData.rateInfos[0]
        expect(targetRateBeforeUnlock.id).toBeDefined()

        // Unlock the rate
        const unlockResult = await stateServer.executeOperation({
            query: UNLOCK_RATE,
            variables: {
                input: {
                    rateID: targetRateBeforeUnlock.id,
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
