import { v4 as uuidv4 } from 'uuid'
import { describe, expect, it } from 'vitest'
import { must } from '../../testHelpers'
import { mockInsertContractArgs } from '../../testHelpers'
import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'
import { insertDraftContract } from './insertContract'
import { overrideContractData } from './overrideContractData'
import { submitContract } from './submitContract'
import type {
    ContractDocumentOverrideInput,
    OverrideContractDataArgsType,
} from './overrideContractData'

type OverrideContractDataClient = Parameters<typeof overrideContractData>[0]
type RevisionOverrideInput = NonNullable<
    OverrideContractDataArgsType['overrides']['revisionOverride']
>

function addDocumentOverride(input: {
    name: string
    s3URL: string
    s3BucketName: string
    s3Key: string
    sha256: string
    dateAdded?: Date
}): ContractDocumentOverrideInput {
    return {
        ...input,
        documentOp: 'ADD',
        documentSha256: input.sha256,
        dateAddedOp: input.dateAdded ? 'OVERRIDE' : null,
    }
}

function overrideDocumentDateAdded(input: {
    documentID: string
    documentSha256: string
    dateAdded: Date
}): ContractDocumentOverrideInput {
    return {
        documentOp: 'OVERRIDE',
        documentID: input.documentID,
        documentSha256: input.documentSha256,
        dateAddedOp: 'OVERRIDE',
        dateAdded: input.dateAdded,
    }
}

function clearDocumentDateAdded(input: {
    documentID: string
    documentSha256: string
}): ContractDocumentOverrideInput {
    return {
        documentOp: 'OVERRIDE',
        documentID: input.documentID,
        documentSha256: input.documentSha256,
        dateAddedOp: 'CLEAR_OVERRIDE',
    }
}

function deleteDocumentOverride(input: {
    documentSha256: string
    documentID?: string
}): ContractDocumentOverrideInput {
    return {
        documentOp: 'DELETE',
        documentID: input.documentID,
        documentSha256: input.documentSha256,
    }
}

// Inserts a draft contract with two contractDocuments and one supportingDocument,
// submits it, and returns the bits commonly needed across the override tests.
async function setupSubmittedContractWithDocs(
    contractDocuments = [
        {
            name: 'cd1.pdf',
            s3URL: 's3://bucket/cd1',
            s3BucketName: 'bucket',
            s3Key: 'allusers/cd1',
            sha256: 'sha-cd1',
        },
        {
            name: 'cd2.pdf',
            s3URL: 's3://bucket/cd2',
            s3BucketName: 'bucket',
            s3Key: 'allusers/cd2',
            sha256: 'sha-cd2',
        },
    ]
) {
    const client = await sharedTestPrismaClient()
    const stateUser = await client.user.create({
        data: {
            id: uuidv4(),
            givenName: 'Aang',
            familyName: 'Avatar',
            email: 'aang@example.com',
            role: 'STATE_USER',
            stateCode: 'MN',
        },
    })
    const cmsUser = await client.user.create({
        data: {
            id: uuidv4(),
            givenName: 'Zuko',
            familyName: 'Hotman',
            email: 'zuko@example.com',
            role: 'CMS_USER',
        },
    })

    const draftContract = must(
        await insertDraftContract(
            client,
            mockInsertContractArgs({
                contractType: 'BASE',
                contractDocuments,
                supportingDocuments: [
                    {
                        name: 'sd1.pdf',
                        s3URL: 's3://bucket/sd1',
                        s3BucketName: 'bucket',
                        s3Key: 'allusers/sd1',
                        sha256: 'sha-sd1',
                    },
                ],
            })
        )
    )
    const submittedContract = must(
        await submitContract(client, {
            contractID: draftContract.id,
            submittedByUserID: stateUser.id,
            submittedReason: 'initial submit',
        })
    )
    return { client, stateUser, cmsUser, draftContract, submittedContract }
}

async function applyRevisionOverride(input: {
    client: OverrideContractDataClient
    contractID: string
    updatedByID: string
    description: string
    revisionOverride: RevisionOverrideInput
}) {
    return must(
        await overrideContractData(input.client, {
            contractID: input.contractID,
            updatedByID: input.updatedByID,
            description: input.description,
            overrides: {
                revisionOverride: input.revisionOverride,
            },
        })
    )
}

describe('overrideContractData', () => {
    it('creates contract metadata and revision overrides on the latest submitted revision', async () => {
        const { client, cmsUser, submittedContract } =
            await setupSubmittedContractWithDocs()
        const initiallySubmittedAt = new Date('2024-01-01')

        const overriddenContract = must(
            await overrideContractData(client, {
                contractID: submittedContract.id,
                updatedByID: cmsUser.id,
                description: 'Override contract metadata',
                overrides: {
                    initiallySubmittedAt,
                    initiallySubmittedAtOp: 'OVERRIDE',
                    revisionOverride: {
                        contractType: 'AMENDMENT',
                        contractTypeOp: 'OVERRIDE',
                    },
                },
            })
        )

        expect(overriddenContract.contractOverrides?.[0]).toMatchObject({
            description: 'Override contract metadata',
            overrides: {
                initiallySubmittedAt,
                initiallySubmittedAtOp: 'OVERRIDE',
                revisionOverride: {
                    contractRevisionID:
                        submittedContract.packageSubmissions[0].contractRevision
                            .id,
                    contractType: 'AMENDMENT',
                    contractTypeOp: 'OVERRIDE',
                },
            },
        })
        expect(overriddenContract.revisions[0].formData.contractType).toBe(
            'AMENDMENT'
        )
    })

    it('rejects overrides unless the contract is submitted, resubmitted, or approved', async () => {
        const client = await sharedTestPrismaClient()
        const cmsUser = await client.user.create({
            data: {
                id: uuidv4(),
                givenName: 'Zuko',
                familyName: 'Hotman',
                email: 'zuko@example.com',
                role: 'CMS_USER',
            },
        })
        const draftContract = must(
            await insertDraftContract(client, mockInsertContractArgs({}))
        )

        const result = await overrideContractData(client, {
            contractID: draftContract.id,
            updatedByID: cmsUser.id,
            description: 'Override draft contract',
            overrides: {
                revisionOverride: {
                    contractType: 'AMENDMENT',
                    contractTypeOp: 'OVERRIDE',
                },
            },
        })

        expect(result).toBeInstanceOf(Error)
        expect((result as Error).message).toContain(
            'contract consolidated status must be SUBMITTED, RESUBMITTED, or APPROVED'
        )
    })

    it('clears scalar contract revision overrides', async () => {
        const { client, cmsUser, submittedContract } =
            await setupSubmittedContractWithDocs()

        await applyRevisionOverride({
            client,
            contractID: submittedContract.id,
            updatedByID: cmsUser.id,
            description: 'Override contract type',
            revisionOverride: {
                contractType: 'AMENDMENT',
                contractTypeOp: 'OVERRIDE',
            },
        })

        const clearedContract = await applyRevisionOverride({
            client,
            contractID: submittedContract.id,
            updatedByID: cmsUser.id,
            description: 'Clear contract type override',
            revisionOverride: {
                contractTypeOp: 'CLEAR_OVERRIDE',
            },
        })

        expect(clearedContract.revisions[0].formData.contractType).toBe('BASE')
        expect(
            clearedContract.contractOverrides?.[0]?.overrides.revisionOverride
                ?.contractTypeOp
        ).toBe('CLEAR_OVERRIDE')
    })

    it('deletes original contract and supporting documents as override rows without deleting base rows', async () => {
        const { client, cmsUser, submittedContract } =
            await setupSubmittedContractWithDocs()
        const baseFormData =
            submittedContract.packageSubmissions[0].contractRevision.formData
        const baseContractDoc = baseFormData.contractDocuments[0]
        const baseSupportingDoc = baseFormData.supportingDocuments[0]

        const overriddenContract = await applyRevisionOverride({
            client,
            contractID: submittedContract.id,
            updatedByID: cmsUser.id,
            description: 'Delete base documents',
            revisionOverride: {
                contractDocuments: [
                    deleteDocumentOverride({
                        documentID: baseContractDoc.id!,
                        documentSha256: baseContractDoc.sha256,
                    }),
                ],
                supportingDocuments: [
                    deleteDocumentOverride({
                        documentID: baseSupportingDoc.id!,
                        documentSha256: baseSupportingDoc.sha256,
                    }),
                ],
            },
        })

        const formData = overriddenContract.revisions[0].formData
        expect(
            formData.contractDocuments.some(
                (doc) => doc.id === baseContractDoc.id
            )
        ).toBe(false)
        expect(
            formData.supportingDocuments.some(
                (doc) => doc.id === baseSupportingDoc.id
            )
        ).toBe(false)
        expect(formData.contractDocuments).toHaveLength(
            baseFormData.contractDocuments.length - 1
        )
        expect(formData.supportingDocuments).toHaveLength(
            baseFormData.supportingDocuments.length - 1
        )

        await expect(
            client.contractDocument.findUnique({
                where: { id: baseContractDoc.id! },
            })
        ).resolves.toBeDefined()
        await expect(
            client.contractSupportingDocument.findUnique({
                where: { id: baseSupportingDoc.id! },
            })
        ).resolves.toBeDefined()
    })

    it('rejects document dateAdded OVERRIDE without a date value', async () => {
        const { client, cmsUser, submittedContract } =
            await setupSubmittedContractWithDocs()
        const baseDoc =
            submittedContract.packageSubmissions[0].contractRevision.formData
                .contractDocuments[0]

        const result = await overrideContractData(client, {
            contractID: submittedContract.id,
            updatedByID: cmsUser.id,
            description: 'Invalid null document dateAdded override',
            overrides: {
                revisionOverride: {
                    contractDocuments: [
                        {
                            documentOp: 'OVERRIDE',
                            documentID: baseDoc.id,
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
        const { client, cmsUser, submittedContract } =
            await setupSubmittedContractWithDocs()
        const addedDocSha = 'sha-added-normalized-doc'
        const addedDateAdded = new Date('2025-10-10')
        const patchedDateAdded = new Date('2025-11-11')

        const addResult = await applyRevisionOverride({
            client,
            contractID: submittedContract.id,
            updatedByID: cmsUser.id,
            description: 'Add document for normalization',
            revisionOverride: {
                contractDocuments: [
                    addDocumentOverride({
                        name: 'added-normalized-doc.pdf',
                        s3URL: 's3://bucket/added-normalized-doc',
                        s3BucketName: 'bucket',
                        s3Key: 'allusers/added-normalized-doc',
                        sha256: addedDocSha,
                        dateAdded: addedDateAdded,
                    }),
                ],
            },
        })
        const addedDoc = addResult.revisions[0].formData.contractDocuments.find(
            (doc) => doc.sha256 === addedDocSha
        )

        expect(addedDoc?.id).toBeDefined()

        const patchResult = await applyRevisionOverride({
            client,
            contractID: submittedContract.id,
            updatedByID: cmsUser.id,
            description: 'Patch override-added document by effective id',
            revisionOverride: {
                contractDocuments: [
                    {
                        documentOp: 'OVERRIDE',
                        documentID: addedDoc!.id,
                        documentSha256: addedDocSha,
                        dateAdded: patchedDateAdded,
                        dateAddedOp: 'OVERRIDE',
                    },
                ],
            },
        })

        expect(
            patchResult.revisions[0].formData.contractDocuments.find(
                (doc) => doc.sha256 === addedDocSha
            )?.dateAdded
        ).toEqual(patchedDateAdded)

        const persistedPatchRow =
            await client.contractDocumentOverride.findFirst({
                where: {
                    documentOp: 'OVERRIDE',
                    documentSha256: addedDocSha,
                    dateAddedOp: 'OVERRIDE',
                },
                orderBy: { createdAt: 'desc' },
            })
        expect(persistedPatchRow?.documentID).toBeNull()

        const deleteResult = await applyRevisionOverride({
            client,
            contractID: submittedContract.id,
            updatedByID: cmsUser.id,
            description: 'Delete override-added document by effective id',
            revisionOverride: {
                contractDocuments: [
                    {
                        documentOp: 'DELETE',
                        documentID: addedDoc!.id,
                        documentSha256: addedDocSha,
                    },
                ],
            },
        })

        expect(
            deleteResult.revisions[0].formData.contractDocuments.some(
                (doc) => doc.sha256 === addedDocSha
            )
        ).toBe(false)

        const persistedDeleteRow =
            await client.contractDocumentOverride.findFirst({
                where: {
                    documentOp: 'DELETE',
                    documentSha256: addedDocSha,
                },
                orderBy: { createdAt: 'desc' },
            })
        expect(persistedDeleteRow?.documentID).toBeNull()
    })

    it('accepts empty document override arrays as no document instructions', async () => {
        const { client, cmsUser, submittedContract } =
            await setupSubmittedContractWithDocs()
        const baseFormData =
            submittedContract.packageSubmissions[0].contractRevision.formData

        const overriddenContract = await applyRevisionOverride({
            client,
            contractID: submittedContract.id,
            updatedByID: cmsUser.id,
            description: 'Empty document override arrays',
            revisionOverride: {
                contractType: 'AMENDMENT',
                contractTypeOp: 'OVERRIDE',
                contractDocuments: [],
                supportingDocuments: [],
            },
        })

        const formData = overriddenContract.revisions[0].formData
        expect(formData.contractType).toBe('AMENDMENT')
        expect(formData.contractDocuments).toHaveLength(
            baseFormData.contractDocuments.length
        )
        expect(formData.supportingDocuments).toHaveLength(
            baseFormData.supportingDocuments.length
        )
        expect(formData.contractDocuments.map((doc) => doc.id)).toEqual(
            baseFormData.contractDocuments.map((doc) => doc.id)
        )
        expect(formData.supportingDocuments.map((doc) => doc.id)).toEqual(
            baseFormData.supportingDocuments.map((doc) => doc.id)
        )
    })

    it('merges many contract override events with sparse document updates, added documents, deletes, and clears', async () => {
        const { client, cmsUser, submittedContract } =
            await setupSubmittedContractWithDocs([
                {
                    name: 'A.pdf',
                    s3URL: 's3://bucket/A',
                    s3BucketName: 'bucket',
                    s3Key: 'allusers/A',
                    sha256: 'sha-A',
                },
                {
                    name: 'B.pdf',
                    s3URL: 's3://bucket/B',
                    s3BucketName: 'bucket',
                    s3Key: 'allusers/B',
                    sha256: 'sha-B',
                },
                {
                    name: 'C.pdf',
                    s3URL: 's3://bucket/C',
                    s3BucketName: 'bucket',
                    s3Key: 'allusers/C',
                    sha256: 'sha-C',
                },
            ])

        const baseDocs =
            submittedContract.packageSubmissions[0].contractRevision.formData
                .contractDocuments
        const baseSupportingDocs =
            submittedContract.packageSubmissions[0].contractRevision.formData
                .supportingDocuments
        const [baseA, baseB, baseC] = baseDocs
        const baseSupportingDoc = baseSupportingDocs[0]
        const a1DateAdded = new Date('2025-01-01')
        const b1DateAdded = new Date('2025-02-02')
        const a2DateAdded = new Date('2025-03-03')
        const c1DateAdded = new Date('2025-04-04')
        const d1DateAdded = new Date('2025-05-05')
        const d2DateAdded = new Date('2025-06-06')
        const a3DateAdded = new Date('2025-07-07')
        const supporting1DateAdded = new Date('2025-08-08')
        const supporting2DateAdded = new Date('2025-09-09')
        const addedContractDocSha = 'sha-added-contract-doc-D'
        const addedSupportingDocSha = 'sha-added-supporting-doc-T'

        // o.1: contractType AMENDMENT + A.1
        await applyRevisionOverride({
            client,
            contractID: submittedContract.id,
            updatedByID: cmsUser.id,
            description: 'Override 1: contractType + A.1',
            revisionOverride: {
                contractType: 'AMENDMENT',
                contractTypeOp: 'OVERRIDE',
                contractDocuments: [
                    overrideDocumentDateAdded({
                        documentID: baseA.id!,
                        documentSha256: baseA.sha256,
                        dateAdded: a1DateAdded,
                    }),
                ],
            },
        })

        // o.2: B.1
        await applyRevisionOverride({
            client,
            contractID: submittedContract.id,
            updatedByID: cmsUser.id,
            description: 'Override 2: B.1',
            revisionOverride: {
                contractDocuments: [
                    overrideDocumentDateAdded({
                        documentID: baseB.id!,
                        documentSha256: baseB.sha256,
                        dateAdded: b1DateAdded,
                    }),
                ],
            },
        })

        // o.3: add D.1
        await applyRevisionOverride({
            client,
            contractID: submittedContract.id,
            updatedByID: cmsUser.id,
            description: 'Override 3: add D.1',
            revisionOverride: {
                contractDocuments: [
                    addDocumentOverride({
                        name: 'D.pdf',
                        s3URL: 's3://bucket/D',
                        s3BucketName: 'bucket',
                        s3Key: 'allusers/D',
                        sha256: addedContractDocSha,
                        dateAdded: d1DateAdded,
                    }),
                ],
            },
        })

        // o.4: A.2, proving later overrides win for the same document field.
        await applyRevisionOverride({
            client,
            contractID: submittedContract.id,
            updatedByID: cmsUser.id,
            description: 'Override 4: A.2',
            revisionOverride: {
                contractDocuments: [
                    overrideDocumentDateAdded({
                        documentID: baseA.id!,
                        documentSha256: baseA.sha256,
                        dateAdded: a2DateAdded,
                    }),
                ],
            },
        })

        // o.5: C.1 + supporting S.1 + add supporting T.
        await applyRevisionOverride({
            client,
            contractID: submittedContract.id,
            updatedByID: cmsUser.id,
            description: 'Override 5: C.1 + supporting docs',
            revisionOverride: {
                contractDocuments: [
                    overrideDocumentDateAdded({
                        documentID: baseC.id!,
                        documentSha256: baseC.sha256,
                        dateAdded: c1DateAdded,
                    }),
                ],
                supportingDocuments: [
                    overrideDocumentDateAdded({
                        documentID: baseSupportingDoc.id!,
                        documentSha256: baseSupportingDoc.sha256,
                        dateAdded: supporting1DateAdded,
                    }),
                    addDocumentOverride({
                        name: 'T.pdf',
                        s3URL: 's3://bucket/T',
                        s3BucketName: 'bucket',
                        s3Key: 'allusers/T',
                        sha256: addedSupportingDocSha,
                    }),
                ],
            },
        })

        // o.6: D.2 + T.2, proving override-added contract and supporting
        // documents can both be patched after their ADD row.
        const d2Contract = await applyRevisionOverride({
            client,
            contractID: submittedContract.id,
            updatedByID: cmsUser.id,
            description: 'Override 6: D.2',
            revisionOverride: {
                contractDocuments: [
                    {
                        documentOp: 'OVERRIDE',
                        documentSha256: addedContractDocSha,
                        dateAddedOp: 'OVERRIDE',
                        dateAdded: d2DateAdded,
                    },
                ],
                supportingDocuments: [
                    {
                        documentOp: 'OVERRIDE',
                        documentSha256: addedSupportingDocSha,
                        dateAddedOp: 'OVERRIDE',
                        dateAdded: supporting2DateAdded,
                    },
                ],
            },
        })

        expect(
            d2Contract.revisions[0].formData.contractDocuments.find(
                (doc) => doc.sha256 === addedContractDocSha
            )?.dateAdded
        ).toEqual(d2DateAdded)
        expect(
            d2Contract.revisions[0].formData.supportingDocuments.find(
                (doc) => doc.sha256 === addedSupportingDocSha
            )?.dateAdded
        ).toEqual(supporting2DateAdded)

        // o.7: delete D + clear B.
        await applyRevisionOverride({
            client,
            contractID: submittedContract.id,
            updatedByID: cmsUser.id,
            description: 'Override 7: delete D + clear B',
            revisionOverride: {
                contractDocuments: [
                    deleteDocumentOverride({
                        documentSha256: addedContractDocSha,
                    }),
                    clearDocumentDateAdded({
                        documentID: baseB.id!,
                        documentSha256: baseB.sha256,
                    }),
                ],
            },
        })

        // o.8: clear contractType, set A.3, clear supporting S, delete T.
        const finalContract = await applyRevisionOverride({
            client,
            contractID: submittedContract.id,
            updatedByID: cmsUser.id,
            description: 'Override 8: final mixed clear',
            revisionOverride: {
                contractTypeOp: 'CLEAR_OVERRIDE',
                contractDocuments: [
                    overrideDocumentDateAdded({
                        documentID: baseA.id!,
                        documentSha256: baseA.sha256,
                        dateAdded: a3DateAdded,
                    }),
                ],
                supportingDocuments: [
                    clearDocumentDateAdded({
                        documentID: baseSupportingDoc.id!,
                        documentSha256: baseSupportingDoc.sha256,
                    }),
                    deleteDocumentOverride({
                        documentSha256: addedSupportingDocSha,
                    }),
                ],
            },
        })

        const formData = finalContract.revisions[0].formData
        expect(formData.contractType).toBe(
            submittedContract.packageSubmissions[0].contractRevision.formData
                .contractType
        )
        expect(formData.contractDocuments).toHaveLength(baseDocs.length)
        expect(formData.supportingDocuments).toHaveLength(
            baseSupportingDocs.length
        )
        expect(
            formData.contractDocuments.find((doc) => doc.id === baseA.id)
                ?.dateAdded
        ).toEqual(a3DateAdded)
        expect(
            formData.contractDocuments.find((doc) => doc.id === baseB.id)
                ?.dateAdded
        ).toEqual(baseB.dateAdded)
        expect(
            formData.contractDocuments.find((doc) => doc.id === baseC.id)
                ?.dateAdded
        ).toEqual(c1DateAdded)
        expect(
            formData.contractDocuments.some(
                (doc) => doc.sha256 === addedContractDocSha
            )
        ).toBe(false)
        expect(
            formData.supportingDocuments.find(
                (doc) => doc.id === baseSupportingDoc.id
            )?.dateAdded
        ).toEqual(baseSupportingDoc.dateAdded)
        expect(
            formData.supportingDocuments.some(
                (doc) => doc.sha256 === addedSupportingDocSha
            )
        ).toBe(false)
    })
})
