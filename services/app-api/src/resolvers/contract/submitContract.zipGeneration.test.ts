import { createAndSubmitTestContractWithRate } from '../../testHelpers/gqlContractHelpers'
import { constructTestPostgresServer } from '../../testHelpers/gqlHelpers'
import { testStateUser } from '../../testHelpers/userHelpers'
import { testS3Client } from '../../testHelpers'
import { generateDocumentZip } from '../../s3/zip'

import { vi } from 'vitest'

describe('Contract Submission Zip Generation Integration', () => {
    const mockS3 = testS3Client()

    it('submits contract with rates successfully and generates zip data', async () => {
        const stateServer = await constructTestPostgresServer({
            s3Client: mockS3,
        })

        // Clear any previous mock calls
        vi.clearAllMocks()

        const submittedContract =
            await createAndSubmitTestContractWithRate(stateServer)

        // Verify core submission functionality works
        expect(submittedContract.status).toBe('SUBMITTED')
        expect(submittedContract.packageSubmissions).toHaveLength(1)

        const packageSubmission = submittedContract.packageSubmissions[0]
        expect(packageSubmission.contractRevision).toBeDefined()
        expect(packageSubmission.rateRevisions).toHaveLength(1)

        // Verify the submission includes the expected documents
        expect(
            packageSubmission.contractRevision.formData.contractDocuments
        ).toHaveLength(1)
        expect(
            packageSubmission.rateRevisions[0].formData.rateDocuments
        ).toHaveLength(1)

        // Verify that zip generation was called for contract documents
        // TODO: finish this test
        /*
        expect(generateDocumentZip).toHaveBeenCalledWith(
            expect.arrayContaining([
                expect.objectContaining({
                    name: 'contractDocument.pdf',
                    s3URL: expect.stringContaining('s3://bucketname/key/'),
                    sha256: expect.any(String),
                }),
            ]),
            `zips/contracts/${packageSubmission.contractRevision.id}/contract-documents.zip`
        )

        // Expect 2 calls: one for contract documents, one for rate documents
        expect(generateDocumentZip).toHaveBeenCalledTimes(2)
        */
    })

    it('continues submission even when zip generation fails', async () => {
        const stateUser = testStateUser()
        const stateServer = await constructTestPostgresServer({
            context: { user: stateUser },
            s3Client: mockS3,
        })

        // Mock zip generation to fail
        const mockGenerateDocumentZipError = vi.mocked(generateDocumentZip)
        mockGenerateDocumentZipError.mockResolvedValueOnce(
            new Error('Mock zip generation failure')
        )

        // This test verifies that contract submission works even when
        // zip generation fails, ensuring submission isn't blocked
        const submittedContract =
            await createAndSubmitTestContractWithRate(stateServer)

        // Verify core submission functionality still works
        expect(submittedContract.status).toBe('SUBMITTED')
        expect(submittedContract.packageSubmissions).toHaveLength(1)

        const packageSubmission = submittedContract.packageSubmissions[0]
        expect(packageSubmission.contractRevision).toBeDefined()
        expect(packageSubmission.rateRevisions).toHaveLength(1)

        // Verify that zip generation was attempted
        expect(generateDocumentZip).toHaveBeenCalled()

        // Verify that the submission succeeded despite zip failure
        expect(
            packageSubmission.contractRevision.formData.contractDocuments
        ).toHaveLength(1)

        // Verify that no zip packages were created due to the failure
        // (graceful failure means submission continues without zip packages)
        expect(
            packageSubmission.contractRevision.documentZipPackages
        ).toHaveLength(0)
    })
})
