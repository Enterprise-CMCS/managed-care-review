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
import {
    storageSmokeFailure,
    type StorageSmokeStep,
} from '../../utils/storageSmokeDiagnostics'

// Exercise the API-to-S3 browser contract, independently of the React upload UI.
// Uses existing human auth; file transfers are authorized by presigned URLs.
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
                // Use the app window's fetch so S3 requests exercise browser CORS.
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
        // Scanning is asynchronous; bound polling rather than waiting indefinitely.
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
        let step: StorageSmokeStep = 'authentication'
        let responseStatus: number | undefined
        let failure: Error | undefined
        const advance = (next: StorageSmokeStep) => {
            step = next
            responseStatus = undefined
        }
        try {
            return await apolloClientWrapper(
                schema,
                stateUser(),
                async (client) => {
                    try {
                        // EICAR is a harmless antivirus test signature; clean cases use a PDF.
                        advance('fixture')
                        const fixture =
                            fixtures[
                                infected ? 'eicar_com.pdf' : 'trussel-guide.pdf'
                            ]
                        if (!fixture) throw new Error('Missing storage fixture')
                        const bytes = Uint8Array.from(atob(fixture), (char) =>
                            char.charCodeAt(0)
                        )
                        advance('current-user')
                        const user = await client.query({
                            query: FetchCurrentUserDocument,
                        })
                        if (!user.data?.fetchCurrentUser)
                            throw new Error('No authenticated user')
                        const fileName = `storage smoke ${Date.now()}.pdf`
                        // Request a signed PUT, optionally including attachment metadata.
                        advance('generate-upload')
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
                        if (
                            !upload?.uploadURL ||
                            !upload.s3Key ||
                            !upload.contentType
                        )
                            throw new Error('Missing upload contract')
                        const headers: Record<string, string> = {
                            'Content-Type': upload.contentType,
                        }
                        if (attachment)
                            headers['Content-Disposition'] =
                                `attachment; filename=${encodeURIComponent(fileName)}`
                        // Upload directly to S3, without creating a submission/document record.
                        advance('put')
                        const put = await browserFetch(upload.uploadURL, {
                            method: 'PUT',
                            headers,
                            body: bytes,
                            mode: 'cors',
                            credentials: 'omit',
                            signal: AbortSignal.timeout(30_000),
                        })
                        responseStatus = put.status
                        if (!put.ok) throw new Error('Presigned PUT denied')
                        advance('scan')
                        const status = await scanStatus(
                            client,
                            upload.s3Key,
                            bucketName
                        )
                        if (status !== (infected ? 'INFECTED' : 'CLEAN'))
                            throw new Error('Unexpected scan verdict')
                        advance('download-url')
                        const download = await client.query({
                            query: FetchS3DownloadUrlDocument,
                            variables: {
                                input: { key: upload.s3Key, bucketName },
                            },
                            fetchPolicy: 'no-cache',
                        })
                        const url = download.data?.fetchS3DownloadURL
                        if (!url) throw new Error('No download URL')
                        // A signed URL must not bypass S3's deny policy for infected objects.
                        advance('get')
                        const get = await browserFetch(url, {
                            mode: 'cors',
                            credentials: 'omit',
                            signal: AbortSignal.timeout(30_000),
                        })
                        responseStatus = get.status
                        if (infected) {
                            expect(
                                get.status,
                                'infected object GET status'
                            ).to.equal(403)
                        } else {
                            if (!get.ok)
                                throw new Error('Clean download denied')
                            // Success status alone is insufficient: verify the bytes match.
                            advance('checksum')
                            expect(
                                await digest(await get.arrayBuffer()),
                                'download SHA-256'
                            ).to.equal(await digest(bytes.buffer))
                        }
                    } catch (error) {
                        // Classify before Apollo flattens errors, without exposing URLs/tokens.
                        failure = storageSmokeFailure(
                            bucketName,
                            infected,
                            step,
                            error,
                            responseStatus
                        )
                        throw failure
                    }
                }
            )
        } catch (error) {
            // Sign-in can fail before the callback; preserve its safe diagnostics too.
            throw (
                failure ??
                storageSmokeFailure(
                    bucketName,
                    infected,
                    step,
                    error,
                    responseStatus
                )
            )
        }
    }

    if (mode === 'AWS_COGNITO') {
        it('allows signed GraphQL request headers in CORS preflight', () => {
            const signedHeaders = [
                'authorization',
                'content-type',
                'x-amz-date',
                'x-amz-security-token',
                'x-amz-content-sha256',
            ]
            // Inspect API preflight headers; S3 transfers still use browser fetch.
            cy.request({
                method: 'OPTIONS',
                url: `${Cypress.env('API_URL').replace(/\/$/, '')}/graphql`,
                headers: {
                    Origin: new URL(Cypress.config('baseUrl')!).origin,
                    'Access-Control-Request-Method': 'POST',
                    'Access-Control-Request-Headers': signedHeaders.join(','),
                },
                log: false,
            }).then(({ headers, status }) => {
                expect(status, 'API preflight status').to.be.within(200, 299)
                const allowedHeaders = String(
                    headers['access-control-allow-headers'] ?? ''
                )
                    .toLowerCase()
                    .split(',')
                    .map((header) => header.trim())
                for (const header of signedHeaders) {
                    expect(
                        allowedHeaders,
                        'API preflight allowed headers'
                    ).to.include(header)
                }
            })
        })
    }

    // Cover both bucket policies and both upload-header contracts.
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
