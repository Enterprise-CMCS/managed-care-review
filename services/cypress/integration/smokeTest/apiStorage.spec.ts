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

// Ask GraphQL for upload and download URLs, then transfer real bytes from a browser.
// This checks signing, cross-origin access and malware handling without driving the
// React upload form. GraphQL uses human authentication; S3 uses the signed URLs.
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
                // cy.request bypasses the browser's cross-origin (CORS) checks. Use
                // the app window's fetch so uploads fail if a real browser would fail.
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
        // A successful upload does not mean the malware scan has finished. Poll
        // pending results until this deadline so a stalled scan fails instead of hanging.
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
                        // Ask the API to authorize a PUT. The attachment case also
                        // signs a filename header that the upload must send unchanged.
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
                        // Upload directly to S3 without creating a submission or document record.
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
                        // The API can issue a URL for either verdict. S3 must still
                        // reject the infected file: its bucket policy, not URL signing,
                        // is what enforces the requirement for a clean scan.
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
                            // A successful HTTP response could contain the wrong file.
                            // Compare SHA-256 hashes to verify the original bytes came back.
                            advance('checksum')
                            expect(
                                await digest(await get.arrayBuffer()),
                                'download SHA-256'
                            ).to.equal(await digest(bytes.buffer))
                        }
                    } catch (error) {
                        // The shared helper rethrows callback errors as plain Error
                        // objects, losing GraphQL codes. Capture safe details here first;
                        // raw messages may contain signed URLs or credentials.
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
            // Authentication can fail before the callback starts. Handle those errors
            // here, but keep the already-sanitized failure for errors from the callback.
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
            // Inspect the headers the API returns for the browser's permission check.
            // cy.request does not itself prove browser CORS works; the file transfers
            // below use browser fetch so those requests are subject to CORS rules.
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

    // Run clean round trips in both buckets. Check ordinary uploads and uploads
    // with a signed filename header, since the required PUT headers differ.
    for (const bucket of buckets) {
        for (const attachment of [false, true]) {
            it(`uploads and downloads clean bytes in ${bucket} (attachment: ${attachment})`, () => {
                cy.then({ timeout: 240_000 }, () =>
                    roundTrip(bucket, false, attachment)
                )
            })
        }
        // The local adapter always reports CLEAN and cannot demonstrate malware
        // protection. Run EICAR cases against AWS to check scanning and S3's GET denial.
        if (mode === 'AWS_COGNITO') {
            it(`denies an infected object download in ${bucket}`, () => {
                cy.then({ timeout: 240_000 }, () => roundTrip(bucket, true))
            })
        }
    }
})
