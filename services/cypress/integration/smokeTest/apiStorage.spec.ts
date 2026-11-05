import type { ApolloClient } from '@apollo/client'
import type { DocumentNode } from 'graphql'
import {
    FetchCurrentUserDocument,
    FetchS3DownloadUrlDocument,
    FetchUploadScanStatusDocument,
    GenerateUploadUrlDocument,
    type UploadBucketName,
} from '../../gen/gqlClient'
import { apolloClientWrapper, stateUser } from '../../utils/apollo-test-utils'

// Existing human Cognito auth: no OIDC registration or browser storage flag.
// S3 fetch runs on the AUT origin, not cy.request or the Cypress runner origin.
describe('API storage transport', () => {
    const mode = Cypress.env('AUTH_MODE')
    const buckets: UploadBucketName[] = [
        'HEALTH_PLAN_DOCS',
        'QUESTION_ANSWER_DOCS',
    ]
    let schema: DocumentNode
    let fixtures: Record<string, string>
    let browserFetch: typeof fetch
    let browserCrypto: Crypto

    before(() => {
        expect(mode, 'explicit storage test auth mode').to.be.oneOf([
            'LOCAL',
            'AWS_COGNITO',
        ])
        cy.task<DocumentNode>('readGraphQLSchema', undefined, {
            log: false,
        }).then((value) => {
            schema = value
        })
        cy.task<Record<string, string>>('readFixtureDocuments', undefined, {
            log: false,
        }).then((value) => {
            fixtures = value
        })
    })

    beforeEach(() => {
        cy.visit('/', {
            onBeforeLoad(win) {
                browserFetch = win.fetch.bind(win)
                browserCrypto = win.crypto
            },
        })
        cy.window({ log: false }).then((win) => {
            expect(win.location.origin, 'review origin').to.equal(
                new URL(Cypress.config('baseUrl')!).origin
            )
        })
    })

    async function scanStatus(
        client: ApolloClient,
        key: string,
        bucketName: UploadBucketName
    ) {
        const deadline = Date.now() + 180_000
        while (Date.now() < deadline) {
            const { data } = await client.query({
                query: FetchUploadScanStatusDocument,
                variables: { input: { key, bucketName } },
                fetchPolicy: 'no-cache',
            })
            const status = data?.fetchUploadScanStatus
            if (status === 'CLEAN' || status === 'INFECTED') return status
            if (status !== 'PENDING')
                throw new Error('Storage scan failed or returned no status')
            await new Promise((resolve) => setTimeout(resolve, 1500))
        }
        throw new Error('Storage scan did not finish within the test deadline')
    }

    async function digest(bytes: ArrayBuffer) {
        const hash = await browserCrypto.subtle.digest('SHA-256', bytes)
        return Array.from(new Uint8Array(hash), (byte) =>
            byte.toString(16).padStart(2, '0')
        ).join('')
    }

    async function roundTrip(
        bucketName: UploadBucketName,
        infected: boolean,
        attachment = false
    ) {
        return apolloClientWrapper(schema, stateUser(), async (client) => {
            try {
                const fixture =
                    fixtures[infected ? 'eicar_com.pdf' : 'trussel-guide.pdf']
                if (!fixture) throw new Error('Missing storage fixture')
                const bytes = Uint8Array.from(atob(fixture), (char) =>
                    char.charCodeAt(0)
                )
                const user = await client.query({
                    query: FetchCurrentUserDocument,
                })
                if (!user.data?.fetchCurrentUser)
                    throw new Error('No authenticated user')
                const fileName = `storage smoke ${Date.now()}.pdf`
                const { data } = await client.mutate({
                    mutation: GenerateUploadUrlDocument,
                    variables: {
                        input: {
                            fileName,
                            fileType: 'PDF',
                            bucketName,
                            ...(attachment
                                ? { includeContentDisposition: true }
                                : {}),
                        },
                    },
                })
                const upload = data?.generateUploadURL
                if (!upload?.uploadURL || !upload.s3Key || !upload.contentType)
                    throw new Error('Missing upload contract')
                const headers: Record<string, string> = {
                    'Content-Type': upload.contentType,
                }
                if (attachment)
                    headers['Content-Disposition'] =
                        `attachment; filename=${encodeURIComponent(fileName)}`
                const put = await browserFetch(upload.uploadURL, {
                    method: 'PUT',
                    headers,
                    body: bytes,
                    mode: 'cors',
                    credentials: 'omit',
                    signal: AbortSignal.timeout(30_000),
                })
                if (!put.ok) throw new Error('Presigned PUT denied')
                const status = await scanStatus(
                    client,
                    upload.s3Key,
                    bucketName
                )
                if (status !== (infected ? 'INFECTED' : 'CLEAN'))
                    throw new Error('Unexpected scan verdict')
                const download = await client.query({
                    query: FetchS3DownloadUrlDocument,
                    variables: { input: { key: upload.s3Key, bucketName } },
                    fetchPolicy: 'no-cache',
                })
                const url = download.data?.fetchS3DownloadURL
                if (!url) throw new Error('No download URL')
                // Signing alone grants no access: S3 must still reject infected GETs.
                const get = await browserFetch(url, {
                    mode: 'cors',
                    credentials: 'omit',
                    signal: AbortSignal.timeout(30_000),
                })
                if (infected) {
                    expect(get.status, 'infected object GET status').to.equal(
                        403
                    )
                } else {
                    if (!get.ok) throw new Error('Clean download denied')
                    expect(
                        await digest(await get.arrayBuffer()),
                        'download SHA-256'
                    ).to.equal(await digest(bytes.buffer))
                }
            } catch {
                // Do not expose signed URLs, tokens, SDK errors or fixture bytes.
                throw new Error(
                    `API storage ${infected ? 'malware' : 'clean'} smoke failed for ${bucketName}; inspect approved server-side diagnostics`
                )
            }
        })
    }

    for (const bucket of buckets) {
        for (const attachment of [false, true]) {
            it(`uploads and downloads clean bytes in ${bucket} (attachment: ${attachment})`, () => {
                cy.then({ timeout: 240_000 }, () =>
                    roundTrip(bucket, false, attachment)
                )
            })
        }
        // LocalStack always reports CLEAN; deployed review CI must run these cases.
        if (mode === 'AWS_COGNITO') {
            it(`denies an infected object download in ${bucket}`, () => {
                cy.then({ timeout: 240_000 }, () => roundTrip(bucket, true))
            })
        }
    }
})
