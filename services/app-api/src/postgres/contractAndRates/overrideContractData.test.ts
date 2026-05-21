import { v4 as uuidv4 } from 'uuid'
import { must } from '../../testHelpers/assertionHelpers'
import { mockInsertContractArgs } from '../../testHelpers/contractDataMocks'
import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'
import { insertDraftContract } from './insertContract'
import { overrideContractData } from './overrideContractData'
import { submitContract } from './submitContract'

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
                        sha256: 'sha-cd1',
                    },
                    {
                        name: 'cd2.pdf',
                        s3URL: 's3://bucket/cd2',
                        sha256: 'sha-cd2',
                    },
                ],
                supportingDocuments: [
                    {
                        name: 'sd1.pdf',
                        s3URL: 's3://bucket/sd1',
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
                    revisionOverride: {
                        contractType: 'AMENDMENT',
                    },
                },
            })
        )

        expect(overriddenContract.contractOverrides?.[0]).toMatchObject({
            description: 'Override contract metadata',
            overrides: {
                initiallySubmittedAt,
                revisionOverride: {
                    contractRevisionID:
                        submittedContract.packageSubmissions[0].contractRevision
                            .id,
                    contractType: 'AMENDMENT',
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
                },
            },
        })

        expect(result).toBeInstanceOf(Error)
        expect((result as Error).message).toContain(
            'contract consolidated status must be SUBMITTED, RESUBMITTED, or APPROVED'
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
                            {
                                name: 'added-cd.pdf',
                                s3URL: 's3://bucket/added-cd',
                                sha256: 'sha-added',
                                dateAdded: addedDateAdded,
                            },
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
        const targetDocID = latestRev.formData.contractDocuments[0].id!
        const newDateAdded = new Date('2025-04-04')

        const overriddenContract = must(
            await overrideContractData(client, {
                contractID: submittedContract.id,
                updatedByID: cmsUser.id,
                description: 'Update a contract document dateAdded',
                overrides: {
                    revisionOverride: {
                        contractDocuments: [
                            {
                                documentID: targetDocID,
                                dateAdded: newDateAdded,
                            },
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
        const existingSupDocID = latestRev.formData.supportingDocuments[0].id!
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
                            {
                                documentID: existingSupDocID,
                                dateAdded: updatedDateAdded,
                            },
                            // add new
                            {
                                name: 'added-sd.pdf',
                                s3URL: 's3://bucket/added-sd',
                                sha256: 'sha-added-sd',
                            },
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

    it('accumulates document overrides across multiple override rows on the same revision', async () => {
        const { client, cmsUser, submittedContract } =
            await setupSubmittedContractWithDocs()

        const latestRev =
            submittedContract.packageSubmissions[0].contractRevision
        // Pick the second existing contract document for the update path.
        const targetDocID = latestRev.formData.contractDocuments[1].id!
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
                            {
                                name: 'added-via-override-1.pdf',
                                s3URL: 's3://bucket/added-via-override-1',
                                sha256: 'sha-added-1',
                            },
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
                            {
                                documentID: targetDocID,
                                dateAdded: newDateAdded,
                            },
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
