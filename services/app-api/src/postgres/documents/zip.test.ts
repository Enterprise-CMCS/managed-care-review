import {
    createDocumentZipPackage,
    findDocumentZipPackagesByContractRevision,
    findDocumentZipPackagesByRateRevision,
    type CreateDocumentZipPackageArgsType,
} from './zip'
import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'
import { insertDraftContract } from '../contractAndRates/insertContract'
import { submitContract } from '../contractAndRates/submitContract'
import { updateDraftContractRates } from '../contractAndRates/updateDraftContractRates'
import {
    must,
    mockInsertContractArgs,
    mockInsertRateArgs,
} from '../../testHelpers'
import { v4 as uuidv4 } from 'uuid'
import type { DocumentZipType, DocumentZipPackage } from '@prisma/client'
import type { ExtendedPrismaClient } from '../prismaClient'
import type { User } from '@prisma/client'

describe('Document Zip Package Database Functions', () => {
    // Helper function to create a submitted rate revision (through contract submission)
    const createAndSubmitTestRate = async (
        client: ExtendedPrismaClient,
        stateUser: User
    ) => {
        // Create contract and add rate to it
        const contractArgs = mockInsertContractArgs({ stateCode: 'FL' })
        const draftContract = must(
            await insertDraftContract(client, contractArgs)
        )

        must(
            await updateDraftContractRates(client, {
                contractID: draftContract.id,
                rateUpdates: {
                    create: [
                        {
                            formData: mockInsertRateArgs({
                                rateCertificationName: 'rate revision 1.0',
                                rateType: 'NEW',
                            }),
                            ratePosition: 1,
                        },
                    ],
                    update: [],
                    link: [],
                    unlink: [],
                    delete: [],
                },
            })
        )

        // Submit the contract (this creates submitted rate revisions)
        const submittedContract = must(
            await submitContract(client, {
                contractID: draftContract.id,
                submittedByUserID: stateUser.id,
                submittedReason: 'initial contract submit',
            })
        )

        // Return the rate revision that was created during contract submission
        return submittedContract.packageSubmissions[0].rateRevisions[0]
    }

    describe('createDocumentZipPackage', () => {
        it('creates contract document zip package successfully', async () => {
            const client = await sharedTestPrismaClient()

            // Create test user
            const stateUser = await client.user.create({
                data: {
                    id: uuidv4(),
                    givenName: 'Test',
                    familyName: 'User',
                    email: 'test@example.com',
                    role: 'STATE_USER',
                    stateCode: 'FL',
                },
            })

            // Create draft contract
            const contractArgs = mockInsertContractArgs({ stateCode: 'FL' })
            const draftContract = must(
                await insertDraftContract(client, contractArgs)
            )

            // Submit the contract (this is when zip packages are created)
            const submittedContract = must(
                await submitContract(client, {
                    contractID: draftContract.id,
                    submittedByUserID: stateUser.id,
                    submittedReason: 'initial submit',
                })
            )

            // Get the submitted revision ID
            const submittedRevision = submittedContract.revisions[0]

            const zipData: CreateDocumentZipPackageArgsType = {
                s3URL: 's3://test-bucket/zips/contracts/123/contract-documents.zip',
                sha256: 'abc123def456',
                s3BucketName: 'test-bucket',
                s3Key: 'zips/contracts/123/contract-documents.zip',
                contractRevisionID: submittedRevision.id,
                documentType: 'CONTRACT_DOCUMENTS' as DocumentZipType,
            }

            const result = await createDocumentZipPackage(client, zipData)

            expect(result).not.toBeInstanceOf(Error)
            expect(result).toEqual(
                expect.objectContaining({
                    id: expect.any(String),
                    s3URL: zipData.s3URL,
                    sha256: zipData.sha256,
                    contractRevisionID: submittedRevision.id,
                    rateRevisionID: null,
                    documentType: 'CONTRACT_DOCUMENTS',
                    createdAt: expect.any(Date),
                    updatedAt: expect.any(Date),
                })
            )
        })

        it('creates rate document zip package successfully', async () => {
            const client = await sharedTestPrismaClient()

            // Create test user
            const stateUser = await client.user.create({
                data: {
                    id: uuidv4(),
                    givenName: 'Test',
                    familyName: 'User',
                    email: 'test@example.com',
                    role: 'STATE_USER',
                    stateCode: 'FL',
                },
            })

            // Create and submit rate using helper
            const submittedRevision = await createAndSubmitTestRate(
                client,
                stateUser
            )

            const zipData: CreateDocumentZipPackageArgsType = {
                s3URL: 's3://test-bucket/zips/rates/456/rate-documents.zip',
                sha256: 'def456ghi789',
                s3BucketName: 'test-bucket',
                s3Key: 'zips/rates/456/rate-documents.zip',
                rateRevisionID: submittedRevision.id,
                documentType: 'RATE_DOCUMENTS' as DocumentZipType,
            }

            const result = await createDocumentZipPackage(client, zipData)

            expect(result).not.toBeInstanceOf(Error)
            expect(result).toEqual(
                expect.objectContaining({
                    id: expect.any(String),
                    s3URL: zipData.s3URL,
                    sha256: zipData.sha256,
                    contractRevisionID: null,
                    rateRevisionID: submittedRevision.id,
                    documentType: 'RATE_DOCUMENTS',
                    createdAt: expect.any(Date),
                    updatedAt: expect.any(Date),
                })
            )
        })

        it('successfully creates zip package with minimal required fields', async () => {
            const client = await sharedTestPrismaClient()

            // All fields are actually optional except s3URL, sha256, bucket/key, and documentType
            const minimalZipData = {
                s3URL: 's3://test-bucket/minimal.zip',
                sha256: 'abc123def456',
                s3BucketName: 'test-bucket',
                s3Key: 'minimal.zip',
                documentType: 'CONTRACT_DOCUMENTS' as DocumentZipType,
                // Both contractRevisionID and rateRevisionID are optional
            }

            const result = await createDocumentZipPackage(
                client,
                minimalZipData
            )

            expect(result).not.toBeInstanceOf(Error)
            expect(result).toEqual(
                expect.objectContaining({
                    id: expect.any(String),
                    s3URL: minimalZipData.s3URL,
                    sha256: minimalZipData.sha256,
                    contractRevisionID: null,
                    rateRevisionID: null,
                    documentType: 'CONTRACT_DOCUMENTS',
                    createdAt: expect.any(Date),
                    updatedAt: expect.any(Date),
                })
            )
        })

        it('returns error when referencing non-existent revision', async () => {
            const client = await sharedTestPrismaClient()

            const zipData: CreateDocumentZipPackageArgsType = {
                s3URL: 's3://test-bucket/test.zip',
                sha256: 'abc123',
                s3BucketName: 'test-bucket',
                s3Key: 'test.zip',
                contractRevisionID: 'non-existent-id',
                documentType: 'CONTRACT_DOCUMENTS' as DocumentZipType,
            }

            const result = await createDocumentZipPackage(client, zipData)

            expect(result).toBeInstanceOf(Error)
            expect((result as Error).message).toContain(
                'Failed to create document zip package'
            )
        })
    })

    describe('findDocumentZipPackagesByContractRevision', () => {
        it('finds zip packages for contract revision', async () => {
            const client = await sharedTestPrismaClient()

            // Create test user and contract
            const stateUser = await client.user.create({
                data: {
                    id: uuidv4(),
                    givenName: 'Test',
                    familyName: 'User',
                    email: 'test@example.com',
                    role: 'STATE_USER',
                    stateCode: 'FL',
                },
            })

            // Create and submit contract
            const contractArgs = mockInsertContractArgs({ stateCode: 'FL' })
            const draftContract = must(
                await insertDraftContract(client, contractArgs)
            )
            const submittedContract = must(
                await submitContract(client, {
                    contractID: draftContract.id,
                    submittedByUserID: stateUser.id,
                    submittedReason: 'initial submit',
                })
            )

            const submittedRevision = submittedContract.revisions[0]

            // Create multiple zip packages
            const zipData1: CreateDocumentZipPackageArgsType = {
                s3URL: 's3://bucket/zip1.zip',
                sha256: 'hash1',
                s3BucketName: 'bucket',
                s3Key: 'zip1.zip',
                contractRevisionID: submittedRevision.id,
                documentType: 'CONTRACT_DOCUMENTS' as DocumentZipType,
            }

            const zipData2: CreateDocumentZipPackageArgsType = {
                s3URL: 's3://bucket/zip2.zip',
                sha256: 'hash2',
                s3BucketName: 'bucket',
                s3Key: 'zip2.zip',
                contractRevisionID: submittedRevision.id,
                documentType: 'CONTRACT_DOCUMENTS' as DocumentZipType,
            }

            await createDocumentZipPackage(client, zipData1)
            await createDocumentZipPackage(client, zipData2)

            const result = await findDocumentZipPackagesByContractRevision(
                client,
                submittedRevision.id
            )

            expect(result).not.toBeInstanceOf(Error)
            const resultArray = result as DocumentZipPackage[]
            expect(resultArray).toHaveLength(2)
            expect(resultArray[0].contractRevisionID).toBe(submittedRevision.id)
            expect(resultArray[1].contractRevisionID).toBe(submittedRevision.id)
        })

        it('filters by document type when specified', async () => {
            const client = await sharedTestPrismaClient()

            // Create test user and submit contract
            const stateUser = await client.user.create({
                data: {
                    id: uuidv4(),
                    givenName: 'Test',
                    familyName: 'User',
                    email: 'test@example.com',
                    role: 'STATE_USER',
                    stateCode: 'FL',
                },
            })

            const contractArgs = mockInsertContractArgs({ stateCode: 'FL' })
            const draftContract = must(
                await insertDraftContract(client, contractArgs)
            )
            const submittedContract = must(
                await submitContract(client, {
                    contractID: draftContract.id,
                    submittedByUserID: stateUser.id,
                    submittedReason: 'initial submit',
                })
            )

            const submittedRevision = submittedContract.revisions[0]

            // Create zip package
            await createDocumentZipPackage(client, {
                s3URL: 's3://bucket/contract.zip',
                sha256: 'hash1',
                s3BucketName: 'bucket',
                s3Key: 'contract.zip',
                contractRevisionID: submittedRevision.id,
                documentType: 'CONTRACT_DOCUMENTS' as DocumentZipType,
            })

            const result = await findDocumentZipPackagesByContractRevision(
                client,
                submittedRevision.id,
                'CONTRACT_DOCUMENTS' as DocumentZipType
            )

            expect(result).not.toBeInstanceOf(Error)
            const resultArray = result as DocumentZipPackage[]
            expect(resultArray).toHaveLength(1)
            expect(resultArray[0].documentType).toBe('CONTRACT_DOCUMENTS')
        })

        it('returns empty array when no zip packages exist', async () => {
            const client = await sharedTestPrismaClient()

            // Create test user and submit contract
            const stateUser = await client.user.create({
                data: {
                    id: uuidv4(),
                    givenName: 'Test',
                    familyName: 'User',
                    email: 'test@example.com',
                    role: 'STATE_USER',
                    stateCode: 'FL',
                },
            })

            const contractArgs = mockInsertContractArgs({ stateCode: 'FL' })
            const draftContract = must(
                await insertDraftContract(client, contractArgs)
            )
            const submittedContract = must(
                await submitContract(client, {
                    contractID: draftContract.id,
                    submittedByUserID: stateUser.id,
                    submittedReason: 'initial submit',
                })
            )

            const submittedRevision = submittedContract.revisions[0]

            const result = await findDocumentZipPackagesByContractRevision(
                client,
                submittedRevision.id
            )

            expect(result).not.toBeInstanceOf(Error)
            const resultArray = result as DocumentZipPackage[]
            expect(resultArray).toHaveLength(0)
        })

        it('returns error when database query fails', async () => {
            // Use invalid client to simulate database error
            const invalidClient = {} as ExtendedPrismaClient

            const result = await findDocumentZipPackagesByContractRevision(
                invalidClient,
                'some-id'
            )

            expect(result).toBeInstanceOf(Error)
            expect((result as Error).message).toContain(
                'Failed to find document zip packages'
            )
        })
    })

    describe('findDocumentZipPackagesByRateRevision', () => {
        it('finds zip packages for rate revision', async () => {
            const client = await sharedTestPrismaClient()

            // Create test user
            const stateUser = await client.user.create({
                data: {
                    id: uuidv4(),
                    givenName: 'Test',
                    familyName: 'User',
                    email: 'test@example.com',
                    role: 'STATE_USER',
                    stateCode: 'FL',
                },
            })

            const submittedRevision = await createAndSubmitTestRate(
                client,
                stateUser
            )

            const zipData: CreateDocumentZipPackageArgsType = {
                s3URL: 's3://bucket/rate.zip',
                sha256: 'rate-hash',
                s3BucketName: 'bucket',
                s3Key: 'rate.zip',
                rateRevisionID: submittedRevision.id,
                documentType: 'RATE_DOCUMENTS' as DocumentZipType,
            }

            await createDocumentZipPackage(client, zipData)

            const result = await findDocumentZipPackagesByRateRevision(
                client,
                submittedRevision.id
            )

            expect(result).not.toBeInstanceOf(Error)
            const resultArray = result as DocumentZipPackage[]
            expect(resultArray).toHaveLength(1)
            expect(resultArray[0].rateRevisionID).toBe(submittedRevision.id)
            expect(resultArray[0].documentType).toBe('RATE_DOCUMENTS')
            expect(resultArray[0].s3URL).toBe('s3://bucket/rate.zip')
        })

        it('filters by document type when specified', async () => {
            const client = await sharedTestPrismaClient()

            // Create test user
            const stateUser = await client.user.create({
                data: {
                    id: uuidv4(),
                    givenName: 'Test',
                    familyName: 'User',
                    email: 'test@example.com',
                    role: 'STATE_USER',
                    stateCode: 'FL',
                },
            })

            const submittedRevision = await createAndSubmitTestRate(
                client,
                stateUser
            )

            await createDocumentZipPackage(client, {
                s3URL: 's3://bucket/rate.zip',
                sha256: 'hash',
                s3BucketName: 'bucket',
                s3Key: 'rate.zip',
                rateRevisionID: submittedRevision.id,
                documentType: 'RATE_DOCUMENTS' as DocumentZipType,
            })

            const result = await findDocumentZipPackagesByRateRevision(
                client,
                submittedRevision.id,
                'RATE_DOCUMENTS' as DocumentZipType
            )

            expect(result).not.toBeInstanceOf(Error)
            const resultArray = result as DocumentZipPackage[]
            expect(resultArray).toHaveLength(1)
            expect(resultArray[0].documentType).toBe('RATE_DOCUMENTS')
        })

        it('returns empty array when no zip packages exist for rate', async () => {
            const client = await sharedTestPrismaClient()

            // Create test user
            const stateUser = await client.user.create({
                data: {
                    id: uuidv4(),
                    givenName: 'Test',
                    familyName: 'User',
                    email: 'test@example.com',
                    role: 'STATE_USER',
                    stateCode: 'FL',
                },
            })

            const submittedRevision = await createAndSubmitTestRate(
                client,
                stateUser
            )

            const result = await findDocumentZipPackagesByRateRevision(
                client,
                submittedRevision.id
            )

            expect(result).not.toBeInstanceOf(Error)
            const resultArray = result as DocumentZipPackage[]
            expect(resultArray).toHaveLength(0)
        })

        it('returns error when database query fails', async () => {
            const invalidClient = {} as ExtendedPrismaClient

            const result = await findDocumentZipPackagesByRateRevision(
                invalidClient,
                'some-id'
            )

            expect(result).toBeInstanceOf(Error)
            expect((result as Error).message).toContain(
                'Failed to find document zip packages'
            )
        })
    })

    describe('cross-revision isolation', () => {
        it('contract and rate zip packages are properly isolated', async () => {
            const client = await sharedTestPrismaClient()

            // Create test user
            const stateUser = await client.user.create({
                data: {
                    id: uuidv4(),
                    givenName: 'Test',
                    familyName: 'User',
                    email: 'test@example.com',
                    role: 'STATE_USER',
                    stateCode: 'FL',
                },
            })

            // Create and submit test contract and rate
            const contractArgs = mockInsertContractArgs({ stateCode: 'FL' })
            const draftContract = must(
                await insertDraftContract(client, contractArgs)
            )
            const submittedContract = must(
                await submitContract(client, {
                    contractID: draftContract.id,
                    submittedByUserID: stateUser.id,
                    submittedReason: 'initial submit',
                })
            )

            const contractRevision = submittedContract.revisions[0]
            const rateRevision = await createAndSubmitTestRate(
                client,
                stateUser
            )

            // Create zip packages for both
            await createDocumentZipPackage(client, {
                s3URL: 's3://bucket/contract.zip',
                sha256: 'contract-hash',
                s3BucketName: 'bucket',
                s3Key: 'contract.zip',
                contractRevisionID: contractRevision.id,
                documentType: 'CONTRACT_DOCUMENTS' as DocumentZipType,
            })

            await createDocumentZipPackage(client, {
                s3URL: 's3://bucket/rate.zip',
                sha256: 'rate-hash',
                s3BucketName: 'bucket',
                s3Key: 'rate.zip',
                rateRevisionID: rateRevision.id,
                documentType: 'RATE_DOCUMENTS' as DocumentZipType,
            })

            // Contract query should only return contract zip
            const contractResult =
                await findDocumentZipPackagesByContractRevision(
                    client,
                    contractRevision.id
                )

            // Rate query should only return rate zip
            const rateResult = await findDocumentZipPackagesByRateRevision(
                client,
                rateRevision.id
            )

            expect(contractResult).not.toBeInstanceOf(Error)
            expect(rateResult).not.toBeInstanceOf(Error)

            const contractArray = contractResult as DocumentZipPackage[]
            const rateArray = rateResult as DocumentZipPackage[]

            expect(contractArray).toHaveLength(1)
            expect(rateArray).toHaveLength(1)

            expect(contractArray[0].contractRevisionID).toBe(
                contractRevision.id
            )
            expect(contractArray[0].rateRevisionID).toBeNull()

            expect(rateArray[0].rateRevisionID).toBe(rateRevision.id)
            expect(rateArray[0].contractRevisionID).toBeNull()
        })
    })
})
