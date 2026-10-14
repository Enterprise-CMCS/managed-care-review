import { newDeployedS3Client } from './s3Deployed'

// Use the real SDK signer: command mocks cannot catch unwanted checksum signing.
it.each([undefined, 'report name.pdf'])(
    'signs unknown upload bytes without an empty-body checksum (filename: %s)',
    async (fileName) => {
        vi.stubEnv('AWS_ACCESS_KEY_ID', 'test-access-key')
        vi.stubEnv('AWS_SECRET_ACCESS_KEY', 'test-secret-key')
        try {
            const s3 = newDeployedS3Client(
                {
                    HEALTH_PLAN_DOCS: 'documents',
                    QUESTION_ANSWER_DOCS: 'questions',
                },
                'us-east-1'
            )
            const url = new URL(
                await s3.getUploadURL(
                    'id.pdf',
                    'HEALTH_PLAN_DOCS',
                    'application/pdf',
                    300,
                    fileName
                )
            )
            expect(url.pathname).toBe('/allusers/id.pdf')
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
        } finally {
            vi.unstubAllEnvs()
        }
    }
)
