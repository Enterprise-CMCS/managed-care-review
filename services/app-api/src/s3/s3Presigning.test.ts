import { newDeployedS3Client } from './s3Deployed'
import { newLocalS3Client } from './s3Local'

const buckets = {
    HEALTH_PLAN_DOCS: 'documents',
    QUESTION_ANSWER_DOCS: 'questions',
}

// Real SDK signing, no network: command mocks cannot catch empty-body checksums.
describe.each([
    {
        name: 'deployed',
        create: () => newDeployedS3Client(buckets, 'us-east-1'),
    },
    {
        name: 'local',
        create: () => newLocalS3Client('http://localhost:4566', buckets),
    },
])('$name upload signer', ({ create }) => {
    beforeEach(() => {
        vi.stubEnv('AWS_ACCESS_KEY_ID', 'test-access-key')
        vi.stubEnv('AWS_SECRET_ACCESS_KEY', 'test-secret-key')
        vi.stubEnv('AWS_SESSION_TOKEN', undefined)
        vi.stubEnv('AWS_EC2_METADATA_DISABLED', 'true')
    })
    afterEach(() => vi.unstubAllEnvs())

    it.each([undefined, 'report name.pdf'])(
        'does not sign an empty-body checksum (filename: %s)',
        async (fileName) => {
            const client = create()
            for (const bucket of [
                'HEALTH_PLAN_DOCS',
                'QUESTION_ANSWER_DOCS',
            ] as const) {
                const url = new URL(
                    await client.getUploadURL(
                        'id.pdf',
                        bucket,
                        'application/pdf',
                        300,
                        fileName
                    )
                )
                expect(url.pathname.endsWith('/allusers/id.pdf')).toBe(true)
                expect(url.searchParams.get('X-Amz-Expires')).toBe('300')
                expect(
                    [...url.searchParams.keys()].some((key) =>
                        key.toLowerCase().includes('checksum')
                    )
                ).toBe(false)
                expect(
                    url.searchParams
                        .get('X-Amz-SignedHeaders')
                        ?.includes('content-disposition')
                ).toBe(Boolean(fileName))
            }
        }
    )
})
