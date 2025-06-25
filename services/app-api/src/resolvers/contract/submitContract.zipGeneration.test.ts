import { createAndSubmitTestContractWithRate } from '../../testHelpers/gqlContractHelpers'
import { constructTestPostgresServer } from '../../testHelpers/gqlHelpers'
import { testStateUser } from '../../testHelpers/userHelpers'
import { testS3Client } from '../../testHelpers'
import { generateDocumentZip } from '../../zip/generateZip'
import { vi } from 'vitest'

// Mock the correct path that matches the import in submitContract
vi.mock('../../zip/generateZip', async () => {
    const actual = await vi.importActual('../../zip/generateZip')
    return {
        ...actual,
        generateDocumentZip: vi.fn(),
    }
})

describe('Contract Submission Zip Generation Integration', () => {
    const mockS3 = testS3Client()
    const mockGenerateDocumentZip = vi.mocked(generateDocumentZip)

    beforeEach(() => {
        vi.clearAllMocks()
        mockGenerateDocumentZip.mockResolvedValue({
            s3URL: 's3://bucketname/zips/test.zip',
            sha256: 'mock-sha256-hash',
        })
    })

    it('submits contract with rates and creates zip packages in database', async () => {
        const stateServer = await constructTestPostgresServer({
            s3Client: mockS3,
        })

        const submittedContract =
            await createAndSubmitTestContractWithRate(stateServer)

        // Verify core submission functionality
        expect(submittedContract.status).toBe('SUBMITTED')
        expect(submittedContract.packageSubmissions).toHaveLength(1)

        const packageSubmission = submittedContract.packageSubmissions[0]
        expect(packageSubmission.contractRevision).toBeDefined()
        expect(packageSubmission.rateRevisions).toHaveLength(1)

        // Verify zip generation was called (once for contract, once for rate)
        expect(mockGenerateDocumentZip).toHaveBeenCalledTimes(2)

        // Verify contract zip package was created in database
        expect(
            packageSubmission.contractRevision.documentZipPackages
        ).toBeDefined()
        expect(
            packageSubmission.contractRevision.documentZipPackages
        ).toHaveLength(1)

        const contractZipPackage =
            packageSubmission.contractRevision.documentZipPackages![0]
        expect(contractZipPackage).toMatchObject({
            documentType: 'CONTRACT_DOCUMENTS',
            s3URL: 's3://bucketname/zips/test.zip',
            sha256: 'mock-sha256-hash',
        })

        // Verify rate zip package was created in database
        expect(
            packageSubmission.rateRevisions[0].documentZipPackages
        ).toBeDefined()
        expect(
            packageSubmission.rateRevisions[0].documentZipPackages
        ).toHaveLength(1)

        const rateZipPackage =
            packageSubmission.rateRevisions[0].documentZipPackages![0]
        expect(rateZipPackage).toMatchObject({
            documentType: 'RATE_DOCUMENTS',
            s3URL: 's3://bucketname/zips/test.zip',
            sha256: 'mock-sha256-hash',
        })
    })

    it('continues submission when zip generation fails and creates no zip packages', async () => {
        const stateUser = testStateUser()
        const stateServer = await constructTestPostgresServer({
            context: { user: stateUser },
            s3Client: mockS3,
        })

        // Mock zip generation to fail
        mockGenerateDocumentZip.mockResolvedValue(
            new Error('Mock zip generation failure')
        )

        const submittedContract =
            await createAndSubmitTestContractWithRate(stateServer)

        // Verify submission still succeeded
        expect(submittedContract.status).toBe('SUBMITTED')
        expect(submittedContract.packageSubmissions).toHaveLength(1)

        const packageSubmission = submittedContract.packageSubmissions[0]

        // Verify zip generation was attempted but failed
        expect(mockGenerateDocumentZip).toHaveBeenCalled()

        // Verify NO zip packages were created due to failure
        expect(
            packageSubmission.contractRevision.documentZipPackages
        ).toBeDefined()
        expect(
            packageSubmission.contractRevision.documentZipPackages
        ).toHaveLength(0)

        expect(
            packageSubmission.rateRevisions[0].documentZipPackages
        ).toBeDefined()
        expect(
            packageSubmission.rateRevisions[0].documentZipPackages
        ).toHaveLength(0)
    })

    it('creates both contract and rate zip packages when generation succeeds', async () => {
        const stateServer = await constructTestPostgresServer({
            s3Client: mockS3,
        })

        const submittedContract =
            await createAndSubmitTestContractWithRate(stateServer)

        expect(submittedContract.status).toBe('SUBMITTED')
        const packageSubmission = submittedContract.packageSubmissions[0]

        // Verify both zip types were attempted
        expect(mockGenerateDocumentZip).toHaveBeenCalledTimes(2)

        // Verify contract zip package
        expect(
            packageSubmission.contractRevision.documentZipPackages
        ).toHaveLength(1)
        expect(
            packageSubmission.contractRevision.documentZipPackages![0]
        ).toMatchObject({
            documentType: 'CONTRACT_DOCUMENTS',
            s3URL: 's3://bucketname/zips/test.zip',
            sha256: 'mock-sha256-hash',
        })

        // Verify rate zip package
        expect(
            packageSubmission.rateRevisions[0].documentZipPackages
        ).toHaveLength(1)
        expect(
            packageSubmission.rateRevisions[0].documentZipPackages![0]
        ).toMatchObject({
            documentType: 'RATE_DOCUMENTS',
            s3URL: 's3://bucketname/zips/test.zip',
            sha256: 'mock-sha256-hash',
        })
    })

    it('creates no zip packages when generation completely fails', async () => {
        const stateServer = await constructTestPostgresServer({
            s3Client: mockS3,
        })

        // Mock complete failure
        mockGenerateDocumentZip.mockResolvedValue(
            new Error('Complete zip failure')
        )

        const submittedContract =
            await createAndSubmitTestContractWithRate(stateServer)

        // Submission should still succeed
        expect(submittedContract.status).toBe('SUBMITTED')
        const packageSubmission = submittedContract.packageSubmissions[0]

        // Verify attempts were made
        expect(mockGenerateDocumentZip).toHaveBeenCalled()

        // Verify no zip packages were created
        expect(
            packageSubmission.contractRevision.documentZipPackages
        ).toHaveLength(0)
        expect(
            packageSubmission.rateRevisions[0].documentZipPackages
        ).toHaveLength(0)
    })
})
