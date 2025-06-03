import { FetchContractDocument } from '../../gen/gqlClient'
import { createTestContract, testS3Client } from '../../testHelpers'
import {
    createAndSubmitTestContractWithRate,
    submitTestContract,
} from '../../testHelpers/gqlContractHelpers'
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

describe('Contract Submission Zip Generation', () => {
    const ldService = testLDService({
        'rate-edit-unlock': true,
    })
    const mockS3 = testS3Client()

    beforeEach(() => {
        vi.clearAllMocks()

        // Setup successful zip generation by default
        mockGenerateDocumentZip.mockResolvedValue({
            s3URL: 's3://test-bucket/zips/contracts/test-id/contract-documents.zip',
            sha256: 'mock-sha256-hash',
        })
    })

    describe('CONTRACT_ONLY submission', () => {
        it('generates zip for contract documents only', async () => {
            const stateUser = testStateUser()
            const stateServer = await constructTestPostgresServer({
                context: { user: stateUser },
                ldService,
                s3Client: mockS3,
            })

            const contract = await createTestContract(stateServer)
            const submittedContract = await submitTestContract(
                stateServer,
                contract.id
            )

            // Verify zip generation was called with contract documents
            expect(mockGenerateDocumentZip).toHaveBeenCalledTimes(1)
            expect(mockGenerateDocumentZip).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({
                        s3URL: expect.stringContaining('s3://'),
                        name: expect.any(String),
                    }),
                ]),
                expect.stringContaining('zips/contracts/')
            )

            // Verify zip package was created in database
            const result = await stateServer.executeOperation({
                query: FetchContractDocument,
                variables: {
                    input: { contractID: submittedContract.id },
                },
            })

            expect(result.errors).toBeUndefined()
            const contractRevision =
                result.data?.fetchContract.contract.packageSubmissions[0]
                    .contractRevision

            expect(contractRevision.documentZipPackages).toHaveLength(1)
            expect(contractRevision.documentZipPackages[0]).toEqual(
                expect.objectContaining({
                    documentType: 'CONTRACT_DOCUMENTS',
                    s3URL: 's3://test-bucket/zips/contracts/test-id/contract-documents.zip',
                    sha256: 'mock-sha256-hash',
                    downloadUrl: expect.stringContaining('http'),
                })
            )
        })

        it('handles zip generation failure gracefully', async () => {
            mockGenerateDocumentZip.mockResolvedValue(
                new Error('Zip generation failed')
            )

            const stateUser = testStateUser()
            const stateServer = await constructTestPostgresServer({
                context: { user: stateUser },
                ldService,
                s3Client: mockS3,
            })

            const contract = await createTestContract(stateServer)
            const result = await submitTestContract(stateServer, contract.id)

            // Submission should still succeed but without zip packages
            expect(result).toBeDefined()

            // Fetch the contract to verify no zip packages were created
            const fetchResult = await stateServer.executeOperation({
                query: FetchContractDocument,
                variables: {
                    input: { contractID: contract.id },
                },
            })

            const contractRevision =
                fetchResult.data?.fetchContract.contract.packageSubmissions[0]
                    .contractRevision

            expect(contractRevision.documentZipPackages).toHaveLength(0)
        })
    })

    describe('CONTRACT_AND_RATES submission', () => {
        it('generates separate zips for contract and rate documents', async () => {
            const stateUser = testStateUser()
            const stateServer = await constructTestPostgresServer({
                context: { user: stateUser },
                ldService,
                s3Client: mockS3,
            })

            // Mock zip generation for both contract and rate documents
            mockGenerateDocumentZip
                .mockResolvedValueOnce({
                    s3URL: 's3://test-bucket/zips/contracts/contract-id/contract-documents.zip',
                    sha256: 'contract-sha256',
                })
                .mockResolvedValueOnce({
                    s3URL: 's3://test-bucket/zips/rates/rate-id/rate-documents.zip',
                    sha256: 'rate-sha256',
                })

            const submittedContract =
                await createAndSubmitTestContractWithRate(stateServer)

            // Should have called zip generation twice - once for contract, once for rates
            expect(mockGenerateDocumentZip).toHaveBeenCalledTimes(2)

            // Verify contract zip call
            expect(mockGenerateDocumentZip).toHaveBeenNthCalledWith(
                1,
                expect.arrayContaining([
                    expect.objectContaining({
                        s3URL: expect.stringContaining('s3://'),
                        name: expect.any(String),
                    }),
                ]),
                expect.stringContaining('zips/contracts/')
            )

            // Verify rate zip call
            expect(mockGenerateDocumentZip).toHaveBeenNthCalledWith(
                2,
                expect.arrayContaining([
                    expect.objectContaining({
                        s3URL: expect.stringContaining('s3://'),
                        name: expect.any(String),
                    }),
                ]),
                expect.stringContaining('zips/rates/')
            )

            // Verify both zip packages were created
            const result = await stateServer.executeOperation({
                query: FetchContractDocument,
                variables: {
                    input: { contractID: submittedContract.id },
                },
            })

            expect(result.errors).toBeUndefined()
            const contractRevision =
                result.data?.fetchContract.contract.packageSubmissions[0]
                    .contractRevision
            const rateRevisions =
                result.data?.fetchContract.contract.packageSubmissions[0]
                    .rateRevisions

            // Contract should have contract document zip
            expect(contractRevision.documentZipPackages).toHaveLength(1)
            expect(contractRevision.documentZipPackages[0].documentType).toBe(
                'CONTRACT_DOCUMENTS'
            )

            // Rate should have rate document zip
            expect(rateRevisions).toHaveLength(1)
            expect(rateRevisions[0].documentZipPackages).toHaveLength(1)
            expect(rateRevisions[0].documentZipPackages[0].documentType).toBe(
                'RATE_DOCUMENTS'
            )
        })

        it('handles partial zip generation failure', async () => {
            const stateUser = testStateUser()
            const stateServer = await constructTestPostgresServer({
                context: { user: stateUser },
                ldService,
                s3Client: mockS3,
            })

            // Contract zip succeeds, rate zip fails
            mockGenerateDocumentZip
                .mockResolvedValueOnce({
                    s3URL: 's3://test-bucket/zips/contracts/contract-id/contract-documents.zip',
                    sha256: 'contract-sha256',
                })
                .mockResolvedValueOnce(new Error('Rate zip generation failed'))

            const submittedContract =
                await createAndSubmitTestContractWithRate(stateServer)

            // Verify contract zip was created but rate zip was not
            const result = await stateServer.executeOperation({
                query: FetchContractDocument,
                variables: {
                    input: { contractID: submittedContract.id },
                },
            })

            const contractRevision =
                result.data?.fetchContract.contract.packageSubmissions[0]
                    .contractRevision
            const rateRevisions =
                result.data?.fetchContract.contract.packageSubmissions[0]
                    .rateRevisions

            // Contract should have zip package
            expect(contractRevision.documentZipPackages).toHaveLength(1)

            // Rate should not have zip package due to failure
            expect(rateRevisions[0].documentZipPackages).toHaveLength(0)
        })
    })

    describe('document preparation for zip', () => {
        it('includes all contract documents with correct names', async () => {
            const stateUser = testStateUser()
            const stateServer = await constructTestPostgresServer({
                context: { user: stateUser },
                ldService,
                s3Client: mockS3,
            })

            const contract = await createTestContract(stateServer, 'FL', {
                contractDocuments: [
                    {
                        s3URL: 's3://bucket/contract1.pdf',
                        name: 'Contract Agreement.pdf',
                        sha256: 'abc123',
                    },
                    {
                        s3URL: 's3://bucket/contract2.pdf',
                        name: 'Rate Certification.pdf',
                        sha256: 'def456',
                    },
                ],
            })

            await submitTestContract(stateServer, contract.id)

            // Verify zip generation was called with all documents
            const zipCall = mockGenerateDocumentZip.mock.calls[0]
            const documents = zipCall[0]

            expect(documents).toHaveLength(2)
            expect(documents).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        s3URL: 's3://bucket/contract1.pdf',
                        name: 'Contract Agreement.pdf',
                        sha256: 'abc123',
                    }),
                    expect.objectContaining({
                        s3URL: 's3://bucket/contract2.pdf',
                        name: 'Rate Certification.pdf',
                        sha256: 'def456',
                    }),
                ])
            )
        })

        it('uses correct S3 destination path for contract zips', async () => {
            const stateUser = testStateUser()
            const stateServer = await constructTestPostgresServer({
                context: { user: stateUser },
                ldService,
                s3Client: mockS3,
            })

            const contract = await createTestContract(stateServer)
            await submitTestContract(stateServer, contract.id)

            const zipCall = mockGenerateDocumentZip.mock.calls[0]
            const destinationPath = zipCall[1]

            expect(destinationPath).toMatch(
                /^zips\/contracts\/.+\/contract-documents\.zip$/
            )
        })

        it('uses correct S3 destination path for rate zips', async () => {
            const stateUser = testStateUser()
            const stateServer = await constructTestPostgresServer({
                context: { user: stateUser },
                ldService,
                s3Client: mockS3,
            })

            await createAndSubmitTestContractWithRate(stateServer)

            // Second call should be for rate documents
            const rateZipCall = mockGenerateDocumentZip.mock.calls[1]
            const destinationPath = rateZipCall[1]

            expect(destinationPath).toMatch(
                /^zips\/rates\/.+\/rate-documents\.zip$/
            )
        })
    })

    describe('zip package database storage', () => {
        it('stores correct metadata for contract zip packages', async () => {
            const stateUser = testStateUser()
            const stateServer = await constructTestPostgresServer({
                context: { user: stateUser },
                ldService,
                s3Client: mockS3,
            })

            const contract = await createTestContract(stateServer)
            const submittedContract = await submitTestContract(
                stateServer,
                contract.id
            )

            const result = await stateServer.executeOperation({
                query: FetchContractDocument,
                variables: {
                    input: { contractID: submittedContract.id },
                },
            })

            const zipPackage =
                result.data?.fetchContract.contract.packageSubmissions[0]
                    .contractRevision.documentZipPackages[0]

            expect(zipPackage).toEqual(
                expect.objectContaining({
                    id: expect.any(String),
                    s3URL: expect.stringContaining('s3://'),
                    sha256: expect.any(String),
                    documentType: 'CONTRACT_DOCUMENTS',
                    downloadUrl: expect.stringContaining('http'),
                    createdAt: expect.any(String),
                })
            )
        })

        it('associates zip packages with correct revisions', async () => {
            const stateUser = testStateUser()
            const stateServer = await constructTestPostgresServer({
                context: { user: stateUser },
                ldService,
                s3Client: mockS3,
            })

            const submittedContract =
                await createAndSubmitTestContractWithRate(stateServer)

            const result = await stateServer.executeOperation({
                query: FetchContractDocument,
                variables: {
                    input: { contractID: submittedContract.id },
                },
            })

            const contractRevision =
                result.data?.fetchContract.contract.packageSubmissions[0]
                    .contractRevision
            const rateRevision =
                result.data?.fetchContract.contract.packageSubmissions[0]
                    .rateRevisions[0]

            // Contract revision should have CONTRACT_DOCUMENTS zip
            expect(contractRevision.documentZipPackages).toHaveLength(1)
            expect(contractRevision.documentZipPackages[0].documentType).toBe(
                'CONTRACT_DOCUMENTS'
            )

            // Rate revision should have RATE_DOCUMENTS zip
            expect(rateRevision.documentZipPackages).toHaveLength(1)
            expect(rateRevision.documentZipPackages[0].documentType).toBe(
                'RATE_DOCUMENTS'
            )
        })
    })
})
