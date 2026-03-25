import { IndexSubmissionLatestRevisionDocument } from '../../gen/gqlClient'
import {
    constructTestPostgresServer,
    executeGraphQLOperation,
} from '../../testHelpers/gqlHelpers'
import { testCMSUser } from '../../testHelpers/userHelpers'

describe('indexSubmissionLatestRevision', () => {
    const cmsUser = testCMSUser()

    it('returns flattened contracts and logs total response size', async () => {
        const cmsServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
        })

        const result = await executeGraphQLOperation(cmsServer, {
            query: IndexSubmissionLatestRevisionDocument,
        })

        expect(result.errors).toBeUndefined()

        const payload = result.data?.indexSubmissionLatestRevision
        expect(payload).toBeDefined()
        expect(payload.totalCount).toBeGreaterThanOrEqual(1)

        // Log total response size
        const responseJson = JSON.stringify(result.data)
        const responseSizeBytes = Buffer.byteLength(responseJson, 'utf8')
        const responseSizeKB = (responseSizeBytes / 1024).toFixed(2)
        const responseSizeMB = (responseSizeBytes / (1024 * 1024)).toFixed(4)

        console.info('--- indexSubmissionLatestRevision response size ---')
        console.info(`Total contracts: ${payload.totalCount}`)
        console.info(
            `Response size: ${responseSizeBytes} bytes (${responseSizeKB} KB / ${responseSizeMB} MB)`
        )
        console.info(
            `Average per contract: ${(responseSizeBytes / payload.totalCount).toFixed(0)} bytes`
        )
    })
})
