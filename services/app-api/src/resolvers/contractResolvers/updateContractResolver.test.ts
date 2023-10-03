import type { GraphQLError } from 'graphql'
import UPDATE_CONTRACT_MUTATION from '../../../../app-graphql/src/mutations/updateContract.graphql'
import type { HealthPlanPackage } from '../../gen/gqlServer'
import { todaysDate } from '../../testHelpers/dateHelpers'
import {
    constructTestPostgresServer,
    createAndUpdateTestHealthPlanPackage,
    createAndSubmitTestHealthPlanPackage,
    defaultFloridaProgram,
    fetchTestHealthPlanPackageById,
    submitTestHealthPlanPackage,
    unlockTestHealthPlanPackage,
    updateTestHealthPlanFormData,
    resubmitTestHealthPlanPackage,
    defaultFloridaRateProgram,
} from '../../testHelpers/gqlHelpers'
import { latestFormData } from '../../testHelpers/healthPlanPackageHelpers'
import { mockStoreThatErrors } from '../../testHelpers/storeHelpers'
import { testEmailConfig, testEmailer } from '../../testHelpers/emailerHelpers'
import { base64ToDomain } from 'app-web/src/common-code/proto/healthPlanFormDataProto'
import {
    generateRateName,
    packageName,
} from 'app-web/src/common-code/healthPlanFormDataType'
import {
    getTestStateAnalystsEmails,
    mockEmailParameterStoreError,
} from '../../testHelpers/parameterStoreHelpers'
import { testCMSUser, testStateUser } from '../../testHelpers/userHelpers'

describe('updateContract', () => {
    const cmsUser = testCMSUser()
    it('updates the contract', async () => {
        const stateServer = await constructTestPostgresServer()

        // First, create a new submitted submission
        const stateSubmission = await createAndSubmitTestHealthPlanPackage(
            stateServer
        )

        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
        })

        // Unlock
        const unlockResult = await cmsServer.executeOperation({
            query: UPDATE_CONTRACT_MUTATION,
            variables: {
                input: {
                    id: stateSubmission.id,
                    mccrsID: '1234',
                },
            },
        })

        expect(unlockResult.errors).toBeUndefined()
    })
})
