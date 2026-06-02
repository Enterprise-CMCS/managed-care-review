import { v4 as uuidv4 } from 'uuid'
import { describe, expect, it } from 'vitest'
import { must } from '../../testHelpers'
import { mockInsertContractArgs } from '../../testHelpers'
import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'
import { insertDraftContract } from './insertContract'
import { overrideContractData } from './overrideContractData'
import { submitContract } from './submitContract'
import type { ContractDocumentOverrideInput } from './overrideContractData'

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

// Inserts a draft contract with two contractDocuments and one supportingDocument,
// submits it, and returns the bits commonly needed across the override tests.
async function setupSubmittedContractWithDocs() {
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
                contractDocuments: [
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
                ],
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

async function setupSubmittedContractWithDuplicateContractDocumentSha() {
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
                contractDocuments: [
                    {
                        name: 'duplicate-1.pdf',
                        s3URL: 's3://bucket/duplicate-1',
                        s3BucketName: 'bucket',
                        s3Key: 'allusers/duplicate-1',
                        sha256: 'duplicate-sha',
                    },
                    {
                        name: 'duplicate-2.pdf',
                        s3URL: 's3://bucket/duplicate-2',
                        s3BucketName: 'bucket',
                        s3Key: 'allusers/duplicate-2',
                        sha256: 'duplicate-sha',
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
    return { client, cmsUser, submittedContract }
}

describe('overrideContractData', () => {
    it('creates contract metadata and revision overrides on the latest submitted revision', async () => {
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
                mockInsertContractArgs({ contractType: 'BASE' })
            )
        )
        const submittedContract = must(
            await submitContract(client, {
                contractID: draftContract.id,
                submittedByUserID: stateUser.id,
                submittedReason: 'initial submit',
            })
        )
        const initiallySubmittedAt = new Date('2024-01-01')

        const overriddenContract = must(
            await overrideContractData(client, {
                contractID: draftContract.id,
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

        must(
            await overrideContractData(client, {
                contractID: submittedContract.id,
                updatedByID: cmsUser.id,
                description: 'Override contract type',
                overrides: {
                    revisionOverride: {
                        contractType: 'AMENDMENT',
                        contractTypeOp: 'OVERRIDE',
                    },
                },
            })
        )

        const clearedContract = must(
            await overrideContractData(client, {
                contractID: submittedContract.id,
                updatedByID: cmsUser.id,
                description: 'Clear contract type override',
                overrides: {
                    revisionOverride: {
                        contractTypeOp: 'CLEAR_OVERRIDE',
                    },
                },
            })
        )

        expect(clearedContract.revisions[0].formData.contractType).toBe('BASE')
        expect(
            clearedContract.contractOverrides?.[0]?.overrides.revisionOverride
                ?.contractTypeOp
        ).toBe('CLEAR_OVERRIDE')
    })

    it('rejects scalar values without matching operation fields', async () => {
        const { client, cmsUser, submittedContract } =
            await setupSubmittedContractWithDocs()

        const result = await overrideContractData(client, {
            contractID: submittedContract.id,
            updatedByID: cmsUser.id,
            description: 'Invalid initiallySubmittedAt payload',
            overrides: {
                initiallySubmittedAt: new Date('2025-01-01'),
            },
        })

        expect(result).toBeInstanceOf(Error)
        expect((result as Error).message).toContain(
            'value cannot be provided without an operation'
        )
    })

    it('rejects clear scalar operations with values', async () => {
        const { client, cmsUser, submittedContract } =
            await setupSubmittedContractWithDocs()

        const result = await overrideContractData(client, {
            contractID: submittedContract.id,
            updatedByID: cmsUser.id,
            description: 'Invalid clear with value',
            overrides: {
                revisionOverride: {
                    contractType: 'AMENDMENT',
                    contractTypeOp: 'CLEAR_OVERRIDE',
                },
            },
        })

        expect(result).toBeInstanceOf(Error)
        expect((result as Error).message).toContain(
            'CLEAR_OVERRIDE cannot carry a value'
        )
    })

    it('rejects non-nullable scalar override to null', async () => {
        const { client, cmsUser, submittedContract } =
            await setupSubmittedContractWithDocs()

        const result = await overrideContractData(client, {
            contractID: submittedContract.id,
            updatedByID: cmsUser.id,
            description: 'Invalid null contract type',
            overrides: {
                revisionOverride: {
                    contractType: null,
                    contractTypeOp: 'OVERRIDE',
                },
            },
        })

        expect(result).toBeInstanceOf(Error)
        expect((result as Error).message).toContain(
            'OVERRIDE value failed schema validation'
        )
    })

    it('adds a new contract document via revisionOverride', async () => {
        const { client, cmsUser, submittedContract } =
            await setupSubmittedContractWithDocs()

        const addedDateAdded = new Date('2025-03-03')

        const overriddenContract = must(
            await overrideContractData(client, {
                contractID: submittedContract.id,
                updatedByID: cmsUser.id,
                description: 'Add a contract document via override',
                overrides: {
                    revisionOverride: {
                        contractDocuments: [
                            addDocumentOverride({
                                name: 'added-cd.pdf',
                                s3URL: 's3://bucket/added-cd',
                                s3BucketName: 'bucket',
                                s3Key: 'allusers/added-cd',
                                sha256: 'sha-added',
                                dateAdded: addedDateAdded,
                            }),
                        ],
                    },
                },
            })
        )

        const formData = overriddenContract.revisions[0].formData
        // Append-at-end semantics: 2 original + 1 added
        expect(formData.contractDocuments).toHaveLength(3)
        expect(formData.contractDocuments[2]).toEqual(
            expect.objectContaining({
                name: 'added-cd.pdf',
                s3URL: 's3://bucket/added-cd',
                sha256: 'sha-added',
                dateAdded: addedDateAdded,
            })
        )
        // Original docs unchanged
        expect(formData.contractDocuments[0].name).toBe('cd1.pdf')
        expect(formData.contractDocuments[1].name).toBe('cd2.pdf')
    })

    it('updates an existing contract document dateAdded via revisionOverride', async () => {
        const { client, cmsUser, submittedContract } =
            await setupSubmittedContractWithDocs()

        const latestRev =
            submittedContract.packageSubmissions[0].contractRevision
        const baseTargetDoc = latestRev.formData.contractDocuments[0]
        const targetDocID = baseTargetDoc.id!
        const newDateAdded = new Date('2025-04-04')

        const overriddenContract = must(
            await overrideContractData(client, {
                contractID: submittedContract.id,
                updatedByID: cmsUser.id,
                description: 'Update a contract document dateAdded',
                overrides: {
                    revisionOverride: {
                        contractDocuments: [
                            overrideDocumentDateAdded({
                                documentID: targetDocID,
                                documentSha256: baseTargetDoc.sha256,
                                dateAdded: newDateAdded,
                            }),
                        ],
                    },
                },
            })
        )

        const formData = overriddenContract.revisions[0].formData
        // No add, no removal: count is the same as the original.
        expect(formData.contractDocuments).toHaveLength(2)
        const targetDoc = formData.contractDocuments.find(
            (d) => d.id === targetDocID
        )
        expect(targetDoc?.dateAdded).toStrictEqual(newDateAdded)
        // The other doc's dateAdded is not touched
        const otherDoc = formData.contractDocuments.find(
            (d) => d.id !== targetDocID
        )
        expect(otherDoc?.name).toBe('cd2.pdf')
    })

    it('adds and updates supportingDocuments in a single override', async () => {
        const { client, cmsUser, submittedContract } =
            await setupSubmittedContractWithDocs()

        const latestRev =
            submittedContract.packageSubmissions[0].contractRevision
        const existingSupDoc = latestRev.formData.supportingDocuments[0]
        const existingSupDocID = existingSupDoc.id!
        const updatedDateAdded = new Date('2025-05-05')

        const overriddenContract = must(
            await overrideContractData(client, {
                contractID: submittedContract.id,
                updatedByID: cmsUser.id,
                description:
                    'Add and update supportingDocuments in a single override',
                overrides: {
                    revisionOverride: {
                        supportingDocuments: [
                            // update existing
                            overrideDocumentDateAdded({
                                documentID: existingSupDocID,
                                documentSha256: existingSupDoc.sha256,
                                dateAdded: updatedDateAdded,
                            }),
                            // add new
                            addDocumentOverride({
                                name: 'added-sd.pdf',
                                s3URL: 's3://bucket/added-sd',
                                s3BucketName: 'bucket',
                                s3Key: 'allusers/added-sd',
                                sha256: 'sha-added-sd',
                            }),
                        ],
                    },
                },
            })
        )

        const formData = overriddenContract.revisions[0].formData
        // 1 original + 1 added = 2
        expect(formData.supportingDocuments).toHaveLength(2)

        const existingDoc = formData.supportingDocuments.find(
            (d) => d.id === existingSupDocID
        )
        expect(existingDoc?.dateAdded).toStrictEqual(updatedDateAdded)

        const addedDoc = formData.supportingDocuments.find(
            (d) => d.id !== existingSupDocID
        )
        expect(addedDoc).toEqual(
            expect.objectContaining({
                name: 'added-sd.pdf',
                s3URL: 's3://bucket/added-sd',
                sha256: 'sha-added-sd',
            })
        )
    })

    it('rejects ADD rows when documentSha256 does not match sha256 payload', async () => {
        const { client, cmsUser, submittedContract } =
            await setupSubmittedContractWithDocs()

        const result = await overrideContractData(client, {
            contractID: submittedContract.id,
            updatedByID: cmsUser.id,
            description: 'Invalid document sha mismatch',
            overrides: {
                revisionOverride: {
                    contractDocuments: [
                        {
                            documentOp: 'ADD',
                            documentSha256: 'document-sha',
                            name: 'mismatch.pdf',
                            s3URL: 's3://bucket/mismatch',
                            s3BucketName: 'bucket',
                            s3Key: 'allusers/mismatch',
                            sha256: 'payload-sha',
                        },
                    ],
                },
            },
        })

        expect(result).toBeInstanceOf(Error)
        expect((result as Error).message).toContain(
            'ADD documentSha256 must match payload sha256'
        )
    })

    it('rejects DELETE rows carrying document payload fields', async () => {
        const { client, cmsUser, submittedContract } =
            await setupSubmittedContractWithDocs()
        const baseDoc =
            submittedContract.packageSubmissions[0].contractRevision.formData
                .contractDocuments[0]

        const result = await overrideContractData(client, {
            contractID: submittedContract.id,
            updatedByID: cmsUser.id,
            description: 'Invalid delete payload',
            overrides: {
                revisionOverride: {
                    contractDocuments: [
                        {
                            documentOp: 'DELETE',
                            documentID: baseDoc.id,
                            documentSha256: baseDoc.sha256,
                            name: baseDoc.name,
                        },
                    ],
                },
            },
        })

        expect(result).toBeInstanceOf(Error)
        expect((result as Error).message).toContain(
            'DELETE cannot carry document payload or scalar field patches'
        )
    })

    it('rejects ambiguous document overrides when duplicate effective documentSha256 values exist', async () => {
        const { client, cmsUser, submittedContract } =
            await setupSubmittedContractWithDuplicateContractDocumentSha()

        const result = await overrideContractData(client, {
            contractID: submittedContract.id,
            updatedByID: cmsUser.id,
            description: 'Ambiguous document override',
            overrides: {
                revisionOverride: {
                    contractDocuments: [
                        {
                            documentOp: 'OVERRIDE',
                            documentSha256: 'duplicate-sha',
                            dateAddedOp: 'OVERRIDE',
                            dateAdded: new Date('2025-08-08'),
                        },
                    ],
                },
            },
        })

        expect(result).toBeInstanceOf(Error)
        expect((result as Error).message).toContain(
            'OVERRIDE target documentSha256 matches multiple effective documents; documentID is required'
        )
    })

    it('accumulates document overrides across multiple override rows on the same revision', async () => {
        const { client, cmsUser, submittedContract } =
            await setupSubmittedContractWithDocs()

        const latestRev =
            submittedContract.packageSubmissions[0].contractRevision
        // Pick the second existing contract document for the update path.
        const baseTargetDoc = latestRev.formData.contractDocuments[1]
        const targetDocID = baseTargetDoc.id!
        const newDateAdded = new Date('2025-06-06')

        // Override #1: add a new contract document.
        must(
            await overrideContractData(client, {
                contractID: submittedContract.id,
                updatedByID: cmsUser.id,
                description: 'Override 1: add a contract document',
                overrides: {
                    revisionOverride: {
                        contractDocuments: [
                            addDocumentOverride({
                                name: 'added-via-override-1.pdf',
                                s3URL: 's3://bucket/added-via-override-1',
                                s3BucketName: 'bucket',
                                s3Key: 'allusers/added-via-override-1',
                                sha256: 'sha-added-1',
                            }),
                        ],
                    },
                },
            })
        )

        // Override #2: update a *different* existing doc's dateAdded.
        const overriddenContract = must(
            await overrideContractData(client, {
                contractID: submittedContract.id,
                updatedByID: cmsUser.id,
                description: 'Override 2: update an existing doc dateAdded',
                overrides: {
                    revisionOverride: {
                        contractDocuments: [
                            overrideDocumentDateAdded({
                                documentID: targetDocID,
                                documentSha256: baseTargetDoc.sha256,
                                dateAdded: newDateAdded,
                            }),
                        ],
                    },
                },
            })
        )

        const formData = overriddenContract.revisions[0].formData
        // 2 original + 1 added from override #1.
        expect(formData.contractDocuments).toHaveLength(3)

        // Effect from override #2: target doc's dateAdded reflects the update.
        const targetDoc = formData.contractDocuments.find(
            (d) => d.id === targetDocID
        )
        expect(targetDoc?.dateAdded).toStrictEqual(newDateAdded)

        // Effect from override #1: added doc is present (appended at end).
        const addedDoc = formData.contractDocuments.find(
            (d) => d.name === 'added-via-override-1.pdf'
        )
        expect(addedDoc).toBeDefined()
    })
})
