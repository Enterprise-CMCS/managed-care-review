import UPDATE_CONTRACT_MUTATION from '../../../../app-graphql/src/mutations/updateContract.graphql'
import {
    constructTestPostgresServer,
    createAndSubmitTestHealthPlanPackage,
} from '../../testHelpers/gqlHelpers'
import { testCMSUser } from '../../testHelpers/userHelpers'
import { testLDService } from '../../testHelpers/launchDarklyHelpers'

describe('updateContract', () => {
    const cmsUser = testCMSUser()
    const mockLDService = testLDService({ ['rates-db-refactor']: true })

    it('updates the contract', async () => {
        const stateServer = await constructTestPostgresServer({
            ldService: mockLDService,
        })

        // First, create a new submitted submission
        const stateSubmission = await createAndSubmitTestHealthPlanPackage(
            stateServer 
        )

        const cmsServer = await constructTestPostgresServer({
            ldService: mockLDService,
            context: {
                user: cmsUser,
            },
        })

        // Update
        const updateResult = await cmsServer.executeOperation({
            query: UPDATE_CONTRACT_MUTATION,
            variables: {
                input: {
                    id: stateSubmission.id,
                    mccrsID: '1234',
                },
            },
        })

        expect(updateResult.errors).toBeUndefined()
        const updatedSub = updateResult?.data?.updateContract.pkg
        expect(updatedSub.mccrsID).toBe('1234')

    })
})
