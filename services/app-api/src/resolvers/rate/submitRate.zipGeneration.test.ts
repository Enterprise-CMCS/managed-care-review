import { testS3Client } from '../../testHelpers'
import { constructTestPostgresServer } from '../../testHelpers/gqlHelpers'
import { testLDService } from '../../testHelpers/launchDarklyHelpers'
import { testStateUser, testCMSUser } from '../../testHelpers/userHelpers'
import {
    createSubmitAndUnlockTestRate,
    submitTestRate,
} from '../../testHelpers/gqlRateHelpers'
import { generateDocumentZip } from '../../s3/zip'
import { vi } from 'vitest'

// Mock the zip generation function
vi.mock('../../s3/zip')
const mockGenerateDocumentZip = generateDocumentZip as vi.MockedFunction<
    typeof generateDocumentZip
>

describe('Rate Submission Zip Generation - Rate-Specific Scenarios', () => {
    const ldService = testLDService({
        'rate-edit-unlock': true,
    })
    const mockS3 = testS3Client()

    beforeEach(() => {
        vi.clearAllMocks()
        mockGenerateDocumentZip.mockResolvedValue({
            s3URL: 's3://test-bucket/zips/rates/test-rate-id/rate-documents.zip',
            sha256: 'mock-rate-sha256-hash',
        })
    })

    describe('standalone rate resubmission', () => {
        it('generates zip for standalone rate resubmission (after unlock)', async () => {
            const stateUser = testStateUser()
            const cmsUser = testCMSUser()
            const stateServer = await constructTestPostgresServer({
                context: { user: stateUser },
                ldService,
                s3Client: mockS3,
            })
            const cmsServer = await constructTestPostgresServer({
                context: { user: cmsUser },
                ldService,
                s3Client: mockS3,
            })

            // Create, submit, and unlock a rate
            const unlockedRate = await createSubmitAndUnlockTestRate(
                stateServer,
                cmsServer
            )

            // Clear mocks since the contract+rate submission above would have triggered zip generation
            vi.clearAllMocks()
            mockGenerateDocumentZip.mockResolvedValue({
                s3URL: 's3://test-bucket/zips/rates/standalone/rate-documents.zip',
                sha256: 'standalone-rate-hash',
            })

            // Now resubmit the rate standalone
            const resubmittedRate = await submitTestRate(
                stateServer,
                unlockedRate.id,
                'Standalone rate resubmission'
            )

            // Verify zip generation was called for the standalone rate submission
            expect(mockGenerateDocumentZip).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({
                        name: 'ratedoc1.doc',
                        s3URL: expect.any(String),
                        sha256: expect.any(String),
                    }),
                    expect.objectContaining({
                        name: 'ratesupdoc1.doc',
                        s3URL: expect.any(String),
                        sha256: expect.any(String),
                    }),
                ]),
                expect.stringMatching(/^zips\/rates\/.+\/rate-documents\.zip$/)
            )

            expect(resubmittedRate.status).toBe('RESUBMITTED')
        })

        it('combines rate documents and supporting documents in zip', async () => {
            const stateUser = testStateUser()
            const cmsUser = testCMSUser()
            const stateServer = await constructTestPostgresServer({
                context: { user: stateUser },
                ldService,
                s3Client: mockS3,
            })
            const cmsServer = await constructTestPostgresServer({
                context: { user: cmsUser },
                ldService,
                s3Client: mockS3,
            })

            const unlockedRate = await createSubmitAndUnlockTestRate(
                stateServer,
                cmsServer
            )

            // Clear mocks from the initial contract submission
            vi.clearAllMocks()

            // Resubmit the rate standalone
            await submitTestRate(
                stateServer,
                unlockedRate.id,
                'Test resubmission'
            )

            // Verify both rateDocuments and supportingDocuments are included
            const zipCall = mockGenerateDocumentZip.mock.calls[0]
            const documents = zipCall[0]

            // Should include both rate docs and supporting docs
            expect(documents.length).toBeGreaterThan(1)
            expect(documents).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ name: 'ratedoc1.doc' }), // rate document
                    expect.objectContaining({ name: 'ratesupdoc1.doc' }), // supporting doc
                    expect.objectContaining({ name: 'ratesupdoc2.doc' }), // supporting doc
                ])
            )
        })

        it('uses correct S3 destination path for standalone rate resubmission', async () => {
            const stateUser = testStateUser()
            const cmsUser = testCMSUser()
            const stateServer = await constructTestPostgresServer({
                context: { user: stateUser },
                ldService,
                s3Client: mockS3,
            })
            const cmsServer = await constructTestPostgresServer({
                context: { user: cmsUser },
                ldService,
                s3Client: mockS3,
            })

            const unlockedRate = await createSubmitAndUnlockTestRate(
                stateServer,
                cmsServer
            )

            // Clear mocks from initial submission
            vi.clearAllMocks()

            await submitTestRate(stateServer, unlockedRate.id, 'Test path')

            const zipCall = mockGenerateDocumentZip.mock.calls[0]
            const destinationPath = zipCall[1]

            // Should follow pattern: zips/rates/{rateRevisionID}/rate-documents.zip
            expect(destinationPath).toMatch(
                /^zips\/rates\/.+\/rate-documents\.zip$/
            )
        })
    })
})
