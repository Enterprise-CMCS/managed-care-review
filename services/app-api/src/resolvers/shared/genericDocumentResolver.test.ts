import { constructTestPostgresServer, extractGraphQLResponse } from '../../testHelpers/gqlHelpers'
import { FetchRateDocument } from '../../gen/gqlClient'
import { testCMSUser } from '../../testHelpers/userHelpers'
import { testLDService } from '../../testHelpers/launchDarklyHelpers'
import { createSubmitAndUnlockTestRate } from '../../testHelpers/gqlRateHelpers'
import { testS3Client } from '../../testHelpers/s3Helpers'

describe(`genericDocumentResolver`, () => {
    const ldService = testLDService({
        'rate-edit-unlock': true,
    })
    const cmsUser = testCMSUser()
    const mockS3 = testS3Client()

    it('populates a download url for documents on fetch', async () => {
        const server = await constructTestPostgresServer({
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
        const submittedRate = await createSubmitAndUnlockTestRate(
            server,
            cmsServer,
            cmsUser
        )
        expect(submittedRate).toBeDefined()

        const input = {
            rateID: submittedRate.id,
        }

        // fetch rate
        const response = await cmsServer.executeOperation({
            query: FetchRateDocument,
            variables: {
                input,
            },
        }, {
            contextValue: { user: cmsUser },
        })
        
        const result = extractGraphQLResponse(response)
        expect(result.errors).toBeUndefined()
        expect(result.data).toBeDefined()

        const fetchedRate = result.data?.fetchRate.rate

        expect(
            fetchedRate.draftRevision.formData.rateDocuments[0].downloadURL
        ).toBeDefined()
    })
})
