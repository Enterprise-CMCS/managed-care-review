import { v4 as uuidv4 } from 'uuid'
import { describe, expect, it } from 'vitest'
import { expectToBeDefined, must } from '../../testHelpers/assertionHelpers'
import { mockInsertContractArgs } from '../../testHelpers'
import { mockInsertRateArgs } from '../../testHelpers'
import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'
import { getDraftContractRateRevisions } from '../../domain-models'
import { insertDraftContract } from './insertContract'
import { overrideRateData } from './overrideRateData'
import { submitContract } from './submitContract'
import { updateDraftContractRates } from './updateDraftContractRates'
import type {
    OverrideRateDataArgsType,
    RateDocumentOverrideInput,
} from './overrideRateData'

type OverrideRateDataClient = Parameters<typeof overrideRateData>[0]
type RateOverridesInput = OverrideRateDataArgsType['overrides']
type RateRevisionOverrideInput = NonNullable<
    RateOverridesInput['revisionOverride']
>

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
    documentID?: string
    documentSha256: string
}): RateDocumentOverrideInput {
    return {
        documentOp: 'DELETE',
        documentID: input.documentID,
        documentSha256: input.documentSha256,
    }
}

function overrideRateDocumentDateAdded(input: {
    documentID?: string
    documentSha256: string
    dateAdded: Date | null
}): RateDocumentOverrideInput {
    return {
        documentOp: 'OVERRIDE',
        documentID: input.documentID,
        documentSha256: input.documentSha256,
        dateAddedOp: 'OVERRIDE',
        dateAdded: input.dateAdded,
    }
}

function clearRateDocumentDateAdded(input: {
    documentID?: string
    documentSha256: string
}): RateDocumentOverrideInput {
    return {
        documentOp: 'OVERRIDE',
        documentID: input.documentID,
        documentSha256: input.documentSha256,
        dateAddedOp: 'CLEAR_OVERRIDE',
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

    return { client, cmsUser, rateID, submittedRateRevision, submittedContract }
}

async function applyRateOverride(input: {
    client: OverrideRateDataClient
    rateID: string
    updatedByID: string
    description: string
    overrides: RateOverridesInput
}) {
    return must(
        await overrideRateData(input.client, {
            rateID: input.rateID,
            updatedByID: input.updatedByID,
            description: input.description,
            overrides: input.overrides,
        })
    )
}

async function applyRateRevisionOverride(input: {
    client: OverrideRateDataClient
    rateID: string
    updatedByID: string
    description: string
    revisionOverride: RateRevisionOverrideInput
}) {
    return applyRateOverride({
        client: input.client,
        rateID: input.rateID,
        updatedByID: input.updatedByID,
        description: input.description,
        overrides: {
            revisionOverride: input.revisionOverride,
        },
    })
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
        const { client, cmsUser, rateID, submittedContract } =
            await setupSubmittedRateWithDocs()
        const initiallySubmittedAt = new Date('2025-02-02')

        const overriddenRate = await applyRateOverride({
            client,
            rateID,
            updatedByID: cmsUser.id,
            description: 'Override rate metadata',
            overrides: {
                initiallySubmittedAt,
                initiallySubmittedAtOp: 'OVERRIDE',
            },
        })

        expect(overriddenRate.rateOverrides?.[0]).toMatchObject({
            description: 'Override rate metadata',
            overrides: {
                initiallySubmittedAt,
                initiallySubmittedAtOp: 'OVERRIDE',
            },
        })
        const contractTableRow = await client.contractTable.findUniqueOrThrow({
            where: { id: submittedContract.id },
            select: { lastActionDate: true },
        })
        expect(contractTableRow.lastActionDate).toEqual(
            overriddenRate.rateOverrides?.[0]?.createdAt
        )
        const rateTableRow = await client.rateTable.findUniqueOrThrow({
            where: { id: rateID },
            select: { lastActionDate: true },
        })
        expect(rateTableRow.lastActionDate).toEqual(
            overriddenRate.rateOverrides?.[0]?.createdAt
        )
    })

    it('clears scalar rate metadata overrides', async () => {
        const { client, cmsUser, rateID } = await setupSubmittedRateWithDocs()
        const initiallySubmittedAt = new Date('2025-02-02')

        await applyRateOverride({
            client,
            rateID,
            updatedByID: cmsUser.id,
            description: 'Override initiallySubmittedAt',
            overrides: {
                initiallySubmittedAt,
                initiallySubmittedAtOp: 'OVERRIDE',
            },
        })

        const clearedRate = await applyRateOverride({
            client,
            rateID,
            updatedByID: cmsUser.id,
            description: 'Clear initiallySubmittedAt override',
            overrides: {
                initiallySubmittedAtOp: 'CLEAR_OVERRIDE',
            },
        })

        // The return type does not return initiallySubmittedAt for assertion.
        // So we assert at the override, to make sure it recorded the override clearing.
        expect(
            clearedRate.rateOverrides?.[0]?.overrides.initiallySubmittedAtOp
        ).toBe('CLEAR_OVERRIDE')
    })

    it('rejects document dateAdded OVERRIDE without a date value', async () => {
        const { client, cmsUser, rateID, submittedRateRevision } =
            await setupSubmittedRateWithDocs()
        const baseDoc = submittedRateRevision.formData.rateDocuments?.[0]
        expectToBeDefined(baseDoc)

        const result = await overrideRateData(client, {
            rateID,
            updatedByID: cmsUser.id,
            description: 'Invalid null document dateAdded override',
            overrides: {
                revisionOverride: {
                    rateDocuments: [
                        {
                            documentOp: 'OVERRIDE',
                            documentID: baseDoc.id!,
                            documentSha256: baseDoc.sha256,
                            dateAddedOp: 'OVERRIDE',
                            dateAdded: null as never,
                        },
                    ],
                },
            },
        })

        expect(result).toBeInstanceOf(Error)
        expect((result as Error).message).toContain(
            'OVERRIDE value failed schema validation'
        )
    })

    it('normalizes override-added document IDs before writing follow-up override and delete rows', async () => {
        const { client, cmsUser, rateID } = await setupSubmittedRateWithDocs()
        const addedDocSha = 'sha-added-normalized-rate-doc'
        const addedDateAdded = new Date('2025-10-10')
        const patchedDateAdded = new Date('2025-11-11')

        const addResult = await applyRateRevisionOverride({
            client,
            rateID,
            updatedByID: cmsUser.id,
            description: 'Add rate document for normalization',
            revisionOverride: {
                rateDocuments: [
                    addRateDocumentOverride({
                        name: 'added-normalized-rate-doc.pdf',
                        s3URL: 's3://bucket/added-normalized-rate-doc',
                        s3BucketName: 'bucket',
                        s3Key: 'allusers/added-normalized-rate-doc',
                        sha256: addedDocSha,
                        dateAdded: addedDateAdded,
                    }),
                ],
            },
        })
        const addedDoc =
            addResult.packageSubmissions[0].rateRevision.formData.rateDocuments?.find(
                (doc) => doc.sha256 === addedDocSha
            )

        expect(addedDoc?.id).toBeDefined()

        const patchResult = await applyRateRevisionOverride({
            client,
            rateID,
            updatedByID: cmsUser.id,
            description: 'Patch override-added rate document by effective id',
            revisionOverride: {
                rateDocuments: [
                    overrideRateDocumentDateAdded({
                        documentID: addedDoc!.id,
                        documentSha256: addedDocSha,
                        dateAdded: patchedDateAdded,
                    }),
                ],
            },
        })

        expect(
            patchResult.packageSubmissions[0].rateRevision.formData.rateDocuments?.find(
                (doc) => doc.sha256 === addedDocSha
            )?.dateAdded
        ).toEqual(patchedDateAdded)

        const persistedPatchRow = await client.rateDocumentOverride.findFirst({
            where: {
                documentOp: 'OVERRIDE',
                documentSha256: addedDocSha,
                dateAddedOp: 'OVERRIDE',
            },
            orderBy: { createdAt: 'desc' },
        })
        expect(persistedPatchRow?.documentID).toBeNull()

        const deleteResult = await applyRateRevisionOverride({
            client,
            rateID,
            updatedByID: cmsUser.id,
            description: 'Delete override-added rate document by effective id',
            revisionOverride: {
                rateDocuments: [
                    deleteRateDocumentOverride({
                        documentID: addedDoc!.id,
                        documentSha256: addedDocSha,
                    }),
                ],
            },
        })

        expect(
            deleteResult.packageSubmissions[0].rateRevision.formData.rateDocuments?.some(
                (doc) => doc.sha256 === addedDocSha
            )
        ).toBe(false)

        const persistedDeleteRow = await client.rateDocumentOverride.findFirst({
            where: {
                documentOp: 'DELETE',
                documentSha256: addedDocSha,
            },
            orderBy: { createdAt: 'desc' },
        })
        expect(persistedDeleteRow?.documentID).toBeNull()
    })

    it('accepts empty document override arrays as no document instructions', async () => {
        const { client, cmsUser, rateID, submittedRateRevision } =
            await setupSubmittedRateWithDocs()
        const baseRateDocuments =
            submittedRateRevision.formData.rateDocuments ?? []
        const baseSupportingDocuments =
            submittedRateRevision.formData.supportingDocuments ?? []

        const overriddenRate = await applyRateRevisionOverride({
            client,
            rateID,
            updatedByID: cmsUser.id,
            description: 'Empty document override arrays',
            revisionOverride: {
                rateDocuments: [],
                supportingDocuments: [],
            },
        })

        const formData =
            overriddenRate.packageSubmissions[0].rateRevision.formData
        const rateDocuments = formData.rateDocuments ?? []
        const supportingDocuments = formData.supportingDocuments ?? []
        expect(rateDocuments).toHaveLength(baseRateDocuments.length)
        expect(supportingDocuments).toHaveLength(baseSupportingDocuments.length)
        expect(rateDocuments.map((doc) => doc.id)).toEqual(
            baseRateDocuments.map((doc) => doc.id)
        )
        expect(supportingDocuments.map((doc) => doc.id)).toEqual(
            baseSupportingDocuments.map((doc) => doc.id)
        )
    })

    it('merges many rate override events with sparse document updates, added documents, deletes, and clears', async () => {
        const { client, cmsUser, rateID, submittedRateRevision } =
            await setupSubmittedRateWithDocs()
        const baseRateDocs = submittedRateRevision.formData.rateDocuments ?? []
        const baseSupportingDocs =
            submittedRateRevision.formData.supportingDocuments ?? []
        const [baseA, baseB] = baseRateDocs
        const [baseSupportingDoc] = baseSupportingDocs
        expectToBeDefined(baseA)
        expectToBeDefined(baseB)
        expectToBeDefined(baseSupportingDoc)
        const initiallySubmittedAt = new Date('2025-09-09')
        const a1DateAdded = new Date('2025-01-01')
        const b1DateAdded = new Date('2025-02-02')
        const a2DateAdded = new Date('2025-03-03')
        const d1DateAdded = new Date('2025-04-04')
        const d2DateAdded = new Date('2025-05-05')
        const supporting1DateAdded = new Date('2025-06-06')
        const a3DateAdded = new Date('2025-07-07')
        const supporting2DateAdded = new Date('2025-08-08')
        const addedRateDocSha = 'sha-added-rate-doc-D'
        const addedSupportingDocSha = 'sha-added-rate-supporting-doc-T'

        // o.1: initiallySubmittedAt + A.1
        await applyRateOverride({
            client,
            rateID,
            updatedByID: cmsUser.id,
            description: 'Override 1: initiallySubmittedAt + A.1',
            overrides: {
                initiallySubmittedAt,
                initiallySubmittedAtOp: 'OVERRIDE',
                revisionOverride: {
                    rateDocuments: [
                        overrideRateDocumentDateAdded({
                            documentID: baseA.id!,
                            documentSha256: baseA.sha256,
                            dateAdded: a1DateAdded,
                        }),
                    ],
                },
            },
        })

        // o.2: B.1
        await applyRateRevisionOverride({
            client,
            rateID,
            updatedByID: cmsUser.id,
            description: 'Override 2: B.1',
            revisionOverride: {
                rateDocuments: [
                    overrideRateDocumentDateAdded({
                        documentID: baseB.id!,
                        documentSha256: baseB.sha256,
                        dateAdded: b1DateAdded,
                    }),
                ],
            },
        })

        // o.3: add D.1
        await applyRateRevisionOverride({
            client,
            rateID,
            updatedByID: cmsUser.id,
            description: 'Override 3: add D.1',
            revisionOverride: {
                rateDocuments: [
                    addRateDocumentOverride({
                        name: 'D.pdf',
                        s3URL: 's3://bucket/D',
                        s3BucketName: 'bucket',
                        s3Key: 'allusers/D',
                        sha256: addedRateDocSha,
                        dateAdded: d1DateAdded,
                    }),
                ],
            },
        })

        // o.4: A.2, proving later overrides win for the same document field.
        await applyRateRevisionOverride({
            client,
            rateID,
            updatedByID: cmsUser.id,
            description: 'Override 4: A.2',
            revisionOverride: {
                rateDocuments: [
                    overrideRateDocumentDateAdded({
                        documentID: baseA.id!,
                        documentSha256: baseA.sha256,
                        dateAdded: a2DateAdded,
                    }),
                ],
            },
        })

        // o.5: supporting S.1 + add supporting T.
        await applyRateRevisionOverride({
            client,
            rateID,
            updatedByID: cmsUser.id,
            description: 'Override 5: supporting docs',
            revisionOverride: {
                supportingDocuments: [
                    overrideRateDocumentDateAdded({
                        documentID: baseSupportingDoc.id!,
                        documentSha256: baseSupportingDoc.sha256,
                        dateAdded: supporting1DateAdded,
                    }),
                    addRateDocumentOverride({
                        name: 'T.pdf',
                        s3URL: 's3://bucket/T',
                        s3BucketName: 'bucket',
                        s3Key: 'allusers/T',
                        sha256: addedSupportingDocSha,
                    }),
                ],
            },
        })

        // o.6: D.2 + T.2, proving override-added rate and supporting
        // documents can both be patched after their ADD row.
        const d2Rate = await applyRateRevisionOverride({
            client,
            rateID,
            updatedByID: cmsUser.id,
            description: 'Override 6: D.2',
            revisionOverride: {
                rateDocuments: [
                    overrideRateDocumentDateAdded({
                        documentSha256: addedRateDocSha,
                        dateAdded: d2DateAdded,
                    }),
                ],
                supportingDocuments: [
                    overrideRateDocumentDateAdded({
                        documentSha256: addedSupportingDocSha,
                        dateAdded: supporting2DateAdded,
                    }),
                ],
            },
        })

        expect(
            d2Rate.packageSubmissions[0].rateRevision.formData.rateDocuments?.find(
                (doc) => doc.sha256 === addedRateDocSha
            )?.dateAdded
        ).toEqual(d2DateAdded)
        expect(
            d2Rate.packageSubmissions[0].rateRevision.formData.supportingDocuments?.find(
                (doc) => doc.sha256 === addedSupportingDocSha
            )?.dateAdded
        ).toEqual(supporting2DateAdded)

        // o.7: delete D + clear B.
        await applyRateRevisionOverride({
            client,
            rateID,
            updatedByID: cmsUser.id,
            description: 'Override 7: delete D + clear B',
            revisionOverride: {
                rateDocuments: [
                    deleteRateDocumentOverride({
                        documentSha256: addedRateDocSha,
                    }),
                    clearRateDocumentDateAdded({
                        documentID: baseB.id!,
                        documentSha256: baseB.sha256,
                    }),
                ],
            },
        })

        // o.8: clear initiallySubmittedAt, set A.3, clear supporting S, delete T.
        const finalRate = await applyRateOverride({
            client,
            rateID,
            updatedByID: cmsUser.id,
            description: 'Override 8: final mixed clear',
            overrides: {
                initiallySubmittedAtOp: 'CLEAR_OVERRIDE',
                revisionOverride: {
                    rateDocuments: [
                        overrideRateDocumentDateAdded({
                            documentID: baseA.id!,
                            documentSha256: baseA.sha256,
                            dateAdded: a3DateAdded,
                        }),
                    ],
                    supportingDocuments: [
                        clearRateDocumentDateAdded({
                            documentID: baseSupportingDoc.id!,
                            documentSha256: baseSupportingDoc.sha256,
                        }),
                        deleteRateDocumentOverride({
                            documentSha256: addedSupportingDocSha,
                        }),
                    ],
                },
            },
        })

        const formData = finalRate.packageSubmissions[0].rateRevision.formData
        const rateDocuments = formData.rateDocuments ?? []
        const supportingDocuments = formData.supportingDocuments ?? []
        expect(
            finalRate.rateOverrides?.[0]?.overrides.initiallySubmittedAtOp
        ).toBe('CLEAR_OVERRIDE')
        expect(rateDocuments).toHaveLength(baseRateDocs.length)
        expect(supportingDocuments).toHaveLength(baseSupportingDocs.length)
        expect(
            rateDocuments.find((doc) => doc.id === baseA.id)?.dateAdded
        ).toEqual(a3DateAdded)
        expect(
            rateDocuments.find((doc) => doc.id === baseB.id)?.dateAdded
        ).toEqual(baseB.dateAdded)
        expect(
            rateDocuments.some((doc) => doc.sha256 === addedRateDocSha)
        ).toBe(false)
        expect(
            supportingDocuments.find((doc) => doc.id === baseSupportingDoc.id)
                ?.dateAdded
        ).toEqual(baseSupportingDoc.dateAdded)
        expect(
            supportingDocuments.some(
                (doc) => doc.sha256 === addedSupportingDocSha
            )
        ).toBe(false)
    })
})
