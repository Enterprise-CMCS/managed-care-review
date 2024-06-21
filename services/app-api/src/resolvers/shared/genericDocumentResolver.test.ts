import { constructTestPostgresServer } from '../../testHelpers/gqlHelpers'
import FETCH_RATE from '../../../../app-graphql/src/queries/fetchRate.graphql'
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
            cmsServer
        )
        expect(submittedRate).toBeDefined()

        const input = {
            rateID: submittedRate.id,
        }

        // fetch rate
        const result = await cmsServer.executeOperation({
            query: FETCH_RATE,
            variables: {
                input,
            },
        })

        const fetchedRate = result.data?.fetchRate.rate

        expect(
            fetchedRate.draftRevision.formData.rateDocuments[0].downloadURL
        ).toBeDefined()
    })
})
