import UPDATE_CONTRACT_MUTATION from '../../../../app-graphql/src/mutations/updateContract.graphql'
import {
    constructTestPostgresServer,
    createAndSubmitTestHealthPlanPackage,
    createTestHealthPlanPackage,
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

    it('errors if the contract is not submitted', async () => {
        const stateServer = await constructTestPostgresServer({
            ldService: mockLDService,
        })

        // First, create a draft submission
        const draftSubmission = await createTestHealthPlanPackage(stateServer)
        const cmsServer = await constructTestPostgresServer({
            ldService: mockLDService,
            context: {
                user: cmsUser,
            },
        })

        // Attempt update
        const updateResult = await cmsServer.executeOperation({
            query: UPDATE_CONTRACT_MUTATION,
            variables: {
                input: {
                    id: draftSubmission.id,
                    mccrsID: '1234',
                },
            },
        })
        expect(updateResult.errors).toBeDefined()
        if (updateResult.errors === undefined) {
            throw new Error('type narrow')
        }

        expect(updateResult.errors[0].extensions?.code).toBe('BAD_USER_INPUT')
        expect(updateResult.errors[0].message).toBe(
            `Can not update a contract has not been submitted. Fails for contract with ID: ${draftSubmission.id}`
        )
    })

    it('errors if a CMS user calls it', async () => {
        const stateServer = await constructTestPostgresServer({
            ldService: mockLDService,
        })

        // First, create a new submitted submission
        const stateSubmission = await createAndSubmitTestHealthPlanPackage(
            stateServer
        )
        // Update
        const updateResult = await stateServer.executeOperation({
            query: UPDATE_CONTRACT_MUTATION,
            variables: {
                input: {
                    id: stateSubmission.id,
                    mccrsID: '1234',
                },
            },
        })
        expect(updateResult.errors).toBeDefined()
        if (updateResult.errors === undefined) {
            throw new Error('type narrow')
        }

        expect(updateResult.errors[0].extensions?.code).toBe('FORBIDDEN')
        expect(updateResult.errors[0].message).toBe(
            'user not authorized to update contract'
        )
    })
})
