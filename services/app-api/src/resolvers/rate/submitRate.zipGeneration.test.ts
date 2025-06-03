import { FetchRateDocument } from '../../gen/gqlClient'
import { createAndSubmitTestRateOnContract } from '../../testHelpers/gqlRateHelpers'
import { createTestContract, testS3Client } from '../../testHelpers'
import { constructTestPostgresServer } from '../../testHelpers/gqlHelpers'
import { testLDService } from '../../testHelpers/launchDarklyHelpers'
import { testStateUser } from '../../testHelpers/userHelpers'
import { generateDocumentZip } from '../../s3/zip'
import { vi } from 'vitest'

// Mock the zip generation function
vi.mock('../../s3/zip')
const mockGenerateDocumentZip = generateDocumentZip as vi.MockedFunction<
    typeof generateDocumentZip
>

describe('Rate Submission Zip Generation', () => {
    const ldService = testLDService({
        'rate-edit-unlock': true,
    })
    const mockS3 = testS3Client()

    beforeEach(() => {
        vi.clearAllMocks()

        // Setup successful zip generation by default
        mockGenerateDocumentZip.mockResolvedValue({
            s3URL: 's3://test-bucket/zips/rates/test-rate-id/rate-documents.zip',
            sha256: 'mock-rate-sha256-hash',
        })
    })

    describe('rate submission with documents', () => {
        it('generates zip for rate documents during submission', async () => {
            const stateUser = testStateUser()
            const stateServer = await constructTestPostgresServer({
                context: { user: stateUser },
                ldService,
                s3Client: mockS3,
            })

            // Create a contract first
            const contract = await createTestContract(stateServer)

            // Add and submit a rate with documents
            const submittedRate = await createAndSubmitTestRateOnContract(
                stateServer,
                contract,
                {
                    rateDocuments: [
                        {
                            s3URL: 's3://bucket/rate-cert.pdf',
                            name: 'Rate Certification.pdf',
                            sha256: 'rate-cert-hash',
                        },
                        {
                            s3URL: 's3://bucket/actuarial-memo.pdf',
                            name: 'Actuarial Memorandum.pdf',
                            sha256: 'actuarial-hash',
                        },
                    ],
                }
            )

            // Verify zip generation was called with rate documents
            expect(mockGenerateDocumentZip).toHaveBeenCalledTimes(1)
            expect(mockGenerateDocumentZip).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({
                        s3URL: 's3://bucket/rate-cert.pdf',
                        name: 'Rate Certification.pdf',
                        sha256: 'rate-cert-hash',
                    }),
                    expect.objectContaining({
                        s3URL: 's3://bucket/actuarial-memo.pdf',
                        name: 'Actuarial Memorandum.pdf',
                        sha256: 'actuarial-hash',
                    }),
                ]),
                expect.stringContaining('zips/rates/')
            )

            // Verify zip package was created in database
            const result = await stateServer.executeOperation({
                query: FetchRateDocument,
                variables: {
                    input: { rateID: submittedRate.id },
                },
            })

            expect(result.errors).toBeUndefined()
            const rateRevision = result.data?.fetchRate.rate.revisions[0]

            expect(rateRevision.documentZipPackages).toHaveLength(1)
            expect(rateRevision.documentZipPackages[0]).toEqual(
                expect.objectContaining({
                    documentType: 'RATE_DOCUMENTS',
                    s3URL: 's3://test-bucket/zips/rates/test-rate-id/rate-documents.zip',
                    sha256: 'mock-rate-sha256-hash',
                    downloadUrl: expect.stringContaining('http'),
                })
            )
        })

        it('handles rate with no documents gracefully', async () => {
            const stateUser = testStateUser()
            const stateServer = await constructTestPostgresServer({
                context: { user: stateUser },
                ldService,
                s3Client: mockS3,
            })

            const contract = await createTestContract(stateServer)

            // Submit rate with no documents
            const submittedRate = await createAndSubmitTestRateOnContract(
                stateServer,
                contract,
                { rateDocuments: [] }
            )

            // Zip generation should not be called for empty documents
            expect(mockGenerateDocumentZip).not.toHaveBeenCalled()

            // Verify no zip packages were created
            const result = await stateServer.executeOperation({
                query: FetchRateDocument,
                variables: {
                    input: { rateID: submittedRate.id },
                },
            })

            const rateRevision = result.data?.fetchRate.rate.revisions[0]
            expect(rateRevision.documentZipPackages).toHaveLength(0)
        })

        it('handles zip generation failure gracefully', async () => {
            mockGenerateDocumentZip.mockResolvedValue(
                new Error('Rate zip generation failed')
            )

            const stateUser = testStateUser()
            const stateServer = await constructTestPostgresServer({
                context: { user: stateUser },
                ldService,
                s3Client: mockS3,
            })

            const contract = await createTestContract(stateServer)

            const submittedRate = await createAndSubmitTestRateOnContract(
                stateServer,
                contract,
                {
                    rateDocuments: [
                        {
                            s3URL: 's3://bucket/rate.pdf',
                            name: 'Rate.pdf',
                            sha256: 'hash',
                        },
                    ],
                }
            )

            // Rate submission should still succeed
            expect(submittedRate).toBeDefined()

            // Verify no zip packages were created due to failure
            const result = await stateServer.executeOperation({
                query: FetchRateDocument,
                variables: {
                    input: { rateID: submittedRate.id },
                },
            })

            const rateRevision = result.data?.fetchRate.rate.revisions[0]
            expect(rateRevision.documentZipPackages).toHaveLength(0)
        })
    })

    describe('rate zip destination paths', () => {
        it('uses correct S3 destination path format', async () => {
            const stateUser = testStateUser()
            const stateServer = await constructTestPostgresServer({
                context: { user: stateUser },
                ldService,
                s3Client: mockS3,
            })

            const contract = await createTestContract(stateServer)

            await createAndSubmitTestRateOnContract(stateServer, contract, {
                rateDocuments: [
                    {
                        s3URL: 's3://bucket/rate.pdf',
                        name: 'Rate.pdf',
                        sha256: 'hash',
                    },
                ],
            })

            const zipCall = mockGenerateDocumentZip.mock.calls[0]
            const destinationPath = zipCall[1]

            // Should follow pattern: zips/rates/{rateRevisionID}/rate-documents.zip
            expect(destinationPath).toMatch(
                /^zips\/rates\/.+\/rate-documents\.zip$/
            )
        })

        it('includes rate revision ID in destination path', async () => {
            const stateUser = testStateUser()
            const stateServer = await constructTestPostgresServer({
                context: { user: stateUser },
                ldService,
                s3Client: mockS3,
            })

            const contract = await createTestContract(stateServer)

            const submittedRate = await createAndSubmitTestRateOnContract(
                stateServer,
                contract,
                {
                    rateDocuments: [
                        {
                            s3URL: 's3://bucket/rate.pdf',
                            name: 'Rate.pdf',
                            sha256: 'hash',
                        },
                    ],
                }
            )

            const zipCall = mockGenerateDocumentZip.mock.calls[0]
            const destinationPath = zipCall[1]

            // Get the rate revision ID from the submitted rate
            const result = await stateServer.executeOperation({
                query: FetchRateDocument,
                variables: {
                    input: { rateID: submittedRate.id },
                },
            })

            const rateRevisionID = result.data?.fetchRate.rate.revisions[0].id
            expect(destinationPath).toContain(rateRevisionID)
        })
    })

    describe('supporting document types', () => {
        it('includes all rate document types in zip', async () => {
            const stateUser = testStateUser()
            const stateServer = await constructTestPostgresServer({
                context: { user: stateUser },
                ldService,
                s3Client: mockS3,
            })

            const contract = await createTestContract(stateServer)

            const rateDocuments = [
                {
                    s3URL: 's3://bucket/rate-cert.pdf',
                    name: 'Rate Certification.pdf',
                    sha256: 'cert-hash',
                },
                {
                    s3URL: 's3://bucket/actuarial-memo.pdf',
                    name: 'Actuarial Memorandum.pdf',
                    sha256: 'memo-hash',
                },
                {
                    s3URL: 's3://bucket/supporting-doc.xlsx',
                    name: 'Supporting Documentation.xlsx',
                    sha256: 'support-hash',
                },
            ]

            await createAndSubmitTestRateOnContract(stateServer, contract, {
                rateDocuments,
            })

            const zipCall = mockGenerateDocumentZip.mock.calls[0]
            const documents = zipCall[0]

            expect(documents).toHaveLength(3)
            expect(documents).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        s3URL: 's3://bucket/rate-cert.pdf',
                        name: 'Rate Certification.pdf',
                        sha256: 'cert-hash',
                    }),
                    expect.objectContaining({
                        s3URL: 's3://bucket/actuarial-memo.pdf',
                        name: 'Actuarial Memorandum.pdf',
                        sha256: 'memo-hash',
                    }),
                    expect.objectContaining({
                        s3URL: 's3://bucket/supporting-doc.xlsx',
                        name: 'Supporting Documentation.xlsx',
                        sha256: 'support-hash',
                    }),
                ])
            )
        })

        it('preserves document names and metadata', async () => {
            const stateUser = testStateUser()
            const stateServer = await constructTestPostgresServer({
                context: { user: stateUser },
                ldService,
                s3Client: mockS3,
            })

            const contract = await createTestContract(stateServer)

            await createAndSubmitTestRateOnContract(stateServer, contract, {
                rateDocuments: [
                    {
                        s3URL: 's3://bucket/special-chars file (v2).pdf',
                        name: 'Special Chars File (v2).pdf',
                        sha256: 'special-hash',
                    },
                ],
            })

            const zipCall = mockGenerateDocumentZip.mock.calls[0]
            const documents = zipCall[0]

            expect(documents[0]).toEqual({
                s3URL: 's3://bucket/special-chars file (v2).pdf',
                name: 'Special Chars File (v2).pdf',
                sha256: 'special-hash',
            })
        })
    })

    describe('database integration', () => {
        it('stores zip package with correct rate revision association', async () => {
            const stateUser = testStateUser()
            const stateServer = await constructTestPostgresServer({
                context: { user: stateUser },
                ldService,
                s3Client: mockS3,
            })

            const contract = await createTestContract(stateServer)

            const submittedRate = await createAndSubmitTestRateOnContract(
                stateServer,
                contract,
                {
                    rateDocuments: [
                        {
                            s3URL: 's3://bucket/rate.pdf',
                            name: 'Rate.pdf',
                            sha256: 'hash',
                        },
                    ],
                }
            )

            const result = await stateServer.executeOperation({
                query: FetchRateDocument,
                variables: {
                    input: { rateID: submittedRate.id },
                },
            })

            const rateRevision = result.data?.fetchRate.rate.revisions[0]
            const zipPackage = rateRevision.documentZipPackages[0]

            expect(zipPackage).toEqual(
                expect.objectContaining({
                    id: expect.any(String),
                    s3URL: expect.stringContaining('s3://'),
                    sha256: expect.any(String),
                    documentType: 'RATE_DOCUMENTS',
                    downloadUrl: expect.stringContaining('http'),
                    createdAt: expect.any(String),
                })
            )
        })

        it('creates separate zip packages for multiple rate revisions', async () => {
            mockGenerateDocumentZip
                .mockResolvedValueOnce({
                    s3URL: 's3://bucket/zips/rates/rev1/rate-documents.zip',
                    sha256: 'rev1-hash',
                })
                .mockResolvedValueOnce({
                    s3URL: 's3://bucket/zips/rates/rev2/rate-documents.zip',
                    sha256: 'rev2-hash',
                })

            const stateUser = testStateUser()
            const stateServer = await constructTestPostgresServer({
                context: { user: stateUser },
                ldService,
                s3Client: mockS3,
            })

            const contract = await createTestContract(stateServer)

            // Submit first rate
            const rate1 = await createAndSubmitTestRateOnContract(
                stateServer,
                contract,
                {
                    rateDocuments: [
                        {
                            s3URL: 's3://bucket/rate1.pdf',
                            name: 'Rate1.pdf',
                            sha256: 'hash1',
                        },
                    ],
                }
            )

            // Submit second rate
            const rate2 = await createAndSubmitTestRateOnContract(
                stateServer,
                contract,
                {
                    rateDocuments: [
                        {
                            s3URL: 's3://bucket/rate2.pdf',
                            name: 'Rate2.pdf',
                            sha256: 'hash2',
                        },
                    ],
                }
            )

            // Verify both rates have separate zip packages
            expect(mockGenerateDocumentZip).toHaveBeenCalledTimes(2)

            const rate1Result = await stateServer.executeOperation({
                query: FetchRateDocument,
                variables: { input: { rateID: rate1.id } },
            })

            const rate2Result = await stateServer.executeOperation({
                query: FetchRateDocument,
                variables: { input: { rateID: rate2.id } },
            })

            const rate1ZipPackage =
                rate1Result.data?.fetchRate.rate.revisions[0]
                    .documentZipPackages[0]
            const rate2ZipPackage =
                rate2Result.data?.fetchRate.rate.revisions[0]
                    .documentZipPackages[0]

            expect(rate1ZipPackage.s3URL).toContain('rev1')
            expect(rate2ZipPackage.s3URL).toContain('rev2')
            expect(rate1ZipPackage.sha256).toBe('rev1-hash')
            expect(rate2ZipPackage.sha256).toBe('rev2-hash')
        })
    })
})
