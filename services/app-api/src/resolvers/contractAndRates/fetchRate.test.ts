import FETCH_RATE from '../../../../app-graphql/src/queries/fetchRate.graphql'
import {
    constructTestPostgresServer,
    createAndSubmitTestHealthPlanPackage,
    unlockTestHealthPlanPackage,
} from '../../testHelpers/gqlHelpers'
import { testCMSUser } from '../../testHelpers/userHelpers'
import { testLDService } from '../../testHelpers/launchDarklyHelpers'
import { latestFormData } from '../../testHelpers/healthPlanPackageHelpers'

describe('fetchRate', () => {
    const mockLDService = testLDService({ 'rates-db-refactor': true })

    it('returns the right revisions as a rate is unlocked', async () => {
        const cmsUser = testCMSUser()
        const server = await constructTestPostgresServer({
            ldService: mockLDService,
        })

        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
            ldService: mockLDService,
        })

        const unlockedSubmission = await createAndSubmitTestHealthPlanPackage(
            server
        )

        // unlock two
        await unlockTestHealthPlanPackage(
            cmsServer,
            unlockedSubmission.id,
            'Test reason'
        )

        const unlockedRateID =
            latestFormData(unlockedSubmission).rateInfos[0].id

        const input = {
            rateID: unlockedRateID,
        }

        // fetch rate
        const result = await cmsServer.executeOperation({
            query: FETCH_RATE,
            variables: {
                input,
            },
        })

        const unlockedRate = result.data?.fetchRate.rate
        expect(result.errors).toBeUndefined()
        expect(unlockedRate).toBeDefined()

        expect(unlockedRate.draftRevision).toBeDefined()
        expect(unlockedRate.draftRevision?.submitInfo).toBeNull()
        expect(unlockedRate.draftRevision?.unlockInfo).toBeTruthy()

        expect(unlockedRate.revisions).toHaveLength(1)
        expect(unlockedRate.revisions[0].submitInfo).toBeTruthy()
        expect(unlockedRate.revisions[0].unlockInfo).toBeNull()
    })
})
