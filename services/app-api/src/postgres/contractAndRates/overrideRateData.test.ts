import { v4 as uuidv4 } from 'uuid'
import { describe, expect, it } from 'vitest'
import { expectToBeDefined, must } from '../../testHelpers/assertionHelpers'
import { mockInsertContractArgs } from '../../testHelpers/contractDataMocks'
import { mockInsertRateArgs } from '../../testHelpers/rateDataMocks'
import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'
import { getDraftContractRateRevisions } from '../../domain-models'
import { insertDraftContract } from './insertContract'
import { overrideRateData } from './overrideRateData'
import { submitContract } from './submitContract'
import { updateDraftContractRates } from './updateDraftContractRates'
import type { RateDocumentOverrideInput } from './overrideRateData'

function addRateDocumentOverride(input: {
    name: string
    s3URL: string
    s3BucketName: string
    s3Key: string
    sha256: string
    dateAdded?: Date | null
}): RateDocumentOverrideInput {
    return {
        ...input,
        documentOp: 'ADD',
        documentSha256: input.sha256,
        dateAddedOp: input.dateAdded !== undefined ? 'OVERRIDE' : null,
    }
}

function deleteRateDocumentOverride(input: {
    documentID: string
    documentSha256: string
}): RateDocumentOverrideInput {
    return {
        documentOp: 'DELETE',
        documentID: input.documentID,
        documentSha256: input.documentSha256,
    }
}

async function setupDraftContractWithDraftRate() {
    const client = await sharedTestPrismaClient()
    const stateUserID = uuidv4()
    const cmsUserID = uuidv4()
    const stateUser = await client.user.create({
        data: {
            id: stateUserID,
            givenName: 'Aang',
            familyName: 'Avatar',
            email: `${stateUserID}@example.com`,
            role: 'STATE_USER',
            stateCode: 'MN',
        },
    })
    const cmsUser = await client.user.create({
        data: {
            id: cmsUserID,
            givenName: 'Zuko',
            familyName: 'Hotman',
            email: `${cmsUserID}@example.com`,
            role: 'CMS_USER',
        },
    })
    const draftContract = must(
        await insertDraftContract(
            client,
            mockInsertContractArgs({
                submissionDescription: 'contract with rate',
            })
        )
    )
    const draftContractWithRate = must(
        await updateDraftContractRates(client, {
            contractID: draftContract.id,
            rateUpdates: {
                create: [
                    {
                        formData: mockInsertRateArgs({
                            rateCertificationName: 'rate with docs',
                            rateType: 'NEW',
                            rateDocuments: [
                                {
                                    name: 'rd1.pdf',
                                    s3URL: 's3://bucket/rd1',
                                    s3BucketName: 'bucket',
                                    s3Key: 'allusers/rd1',
                                    sha256: 'sha-rd1',
                                },
                                {
                                    name: 'rd2.pdf',
                                    s3URL: 's3://bucket/rd2',
                                    s3BucketName: 'bucket',
                                    s3Key: 'allusers/rd2',
                                    sha256: 'sha-rd2',
                                },
                            ],
                            supportingDocuments: [
                                {
                                    name: 'rsd1.pdf',
                                    s3URL: 's3://bucket/rsd1',
                                    s3BucketName: 'bucket',
                                    s3Key: 'allusers/rsd1',
                                    sha256: 'sha-rsd1',
                                },
                            ],
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
    const rateID = getDraftContractRateRevisions(draftContractWithRate)[0]
        .rateID

    return { client, stateUser, cmsUser, draftContract, rateID }
}

async function setupSubmittedRateWithDocs() {
    const { client, stateUser, cmsUser, draftContract, rateID } =
        await setupDraftContractWithDraftRate()

    const submittedContract = must(
        await submitContract(client, {
            contractID: draftContract.id,
            submittedByUserID: stateUser.id,
            submittedReason: 'initial submit',
        })
    )
    const submittedRateRevision =
        submittedContract.packageSubmissions[0].rateRevisions[0]

    return { client, cmsUser, rateID, submittedRateRevision }
}

describe('overrideRateData', () => {
    it('rejects overrides unless the rate is submitted or resubmitted', async () => {
        const { client, cmsUser, rateID } =
            await setupDraftContractWithDraftRate()

        const result = await overrideRateData(client, {
            rateID,
            updatedByID: cmsUser.id,
            description: 'Override draft rate',
            overrides: {
                initiallySubmittedAt: new Date('2025-01-01'),
                initiallySubmittedAtOp: 'OVERRIDE',
            },
        })

        expect(result).toBeInstanceOf(Error)
        expect((result as Error).message).toContain(
            'rate consolidated status must be SUBMITTED or RESUBMITTED'
        )
    })

    it('creates rate metadata override and applies it in history', async () => {
        const { client, cmsUser, rateID } = await setupSubmittedRateWithDocs()
        const initiallySubmittedAt = new Date('2025-02-02')

        const overriddenRate = must(
            await overrideRateData(client, {
                rateID,
                updatedByID: cmsUser.id,
                description: 'Override rate metadata',
                overrides: {
                    initiallySubmittedAt,
                    initiallySubmittedAtOp: 'OVERRIDE',
                },
            })
        )

        expect(overriddenRate.rateOverrides?.[0]).toMatchObject({
            description: 'Override rate metadata',
            overrides: {
                initiallySubmittedAt,
                initiallySubmittedAtOp: 'OVERRIDE',
            },
        })
    })

    it('adds and deletes rate documents through revision overrides', async () => {
        const { client, cmsUser, rateID, submittedRateRevision } =
            await setupSubmittedRateWithDocs()
        const submittedRateDocuments =
            submittedRateRevision.formData.rateDocuments ?? []
        const baseDocToDelete = submittedRateDocuments[0]
        const baseDocToKeep = submittedRateDocuments[1]
        expectToBeDefined(baseDocToDelete)
        expectToBeDefined(baseDocToKeep)
        const addedDateAdded = new Date('2025-03-03')

        const overriddenRate = must(
            await overrideRateData(client, {
                rateID,
                updatedByID: cmsUser.id,
                description: 'Add and delete rate documents',
                overrides: {
                    revisionOverride: {
                        rateDocuments: [
                            deleteRateDocumentOverride({
                                documentID: baseDocToDelete.id!,
                                documentSha256: baseDocToDelete.sha256,
                            }),
                            addRateDocumentOverride({
                                name: 'added-rd.pdf',
                                s3URL: 's3://bucket/added-rd',
                                s3BucketName: 'bucket',
                                s3Key: 'allusers/added-rd',
                                sha256: 'sha-added-rd',
                                dateAdded: addedDateAdded,
                            }),
                        ],
                    },
                },
            })
        )

        const formData =
            overriddenRate.packageSubmissions[0].rateRevision.formData
        const rateDocuments = formData.rateDocuments ?? []
        expect(rateDocuments).toHaveLength(2)
        expect(
            rateDocuments.find((doc) => doc.sha256 === baseDocToDelete.sha256)
        ).toBeUndefined()
        expect(
            rateDocuments.find((doc) => doc.sha256 === baseDocToKeep.sha256)
        ).toEqual(expect.objectContaining({ name: 'rd2.pdf' }))
        expect(
            rateDocuments.find((doc) => doc.sha256 === 'sha-added-rd')
        ).toEqual(
            expect.objectContaining({
                name: 'added-rd.pdf',
                s3URL: 's3://bucket/added-rd',
                dateAdded: addedDateAdded,
            })
        )
    })

    it('adds and deletes rate supporting documents through revision overrides', async () => {
        const { client, cmsUser, rateID, submittedRateRevision } =
            await setupSubmittedRateWithDocs()
        const baseSupportingDoc =
            submittedRateRevision.formData.supportingDocuments?.[0]
        expectToBeDefined(baseSupportingDoc)

        const overriddenRate = must(
            await overrideRateData(client, {
                rateID,
                updatedByID: cmsUser.id,
                description: 'Add and delete rate supporting documents',
                overrides: {
                    revisionOverride: {
                        supportingDocuments: [
                            deleteRateDocumentOverride({
                                documentID: baseSupportingDoc.id!,
                                documentSha256: baseSupportingDoc.sha256,
                            }),
                            addRateDocumentOverride({
                                name: 'added-rsd.pdf',
                                s3URL: 's3://bucket/added-rsd',
                                s3BucketName: 'bucket',
                                s3Key: 'allusers/added-rsd',
                                sha256: 'sha-added-rsd',
                            }),
                        ],
                    },
                },
            })
        )

        const formData =
            overriddenRate.packageSubmissions[0].rateRevision.formData
        const supportingDocuments = formData.supportingDocuments ?? []
        expect(supportingDocuments).toHaveLength(1)
        expect(supportingDocuments[0]).toEqual(
            expect.objectContaining({
                name: 'added-rsd.pdf',
                s3URL: 's3://bucket/added-rsd',
                sha256: 'sha-added-rsd',
            })
        )
    })
})
