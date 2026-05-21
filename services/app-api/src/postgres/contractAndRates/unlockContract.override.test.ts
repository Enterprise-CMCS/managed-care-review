import { v4 as uuidv4 } from 'uuid'
import { must } from '../../testHelpers/assertionHelpers'
import { mockInsertContractArgs } from '../../testHelpers/contractDataMocks'
import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'
import { insertDraftContract } from './insertContract'
import { overrideContractData } from './overrideContractData'
import { submitContract } from './submitContract'
import { unlockContract } from './unlockContract'

// Sets up a submitted contract with two contractDocuments and one
// supportingDocument so document-override unlock tests have something to
// override against.
async function setupSubmittedContractWithDocsForUnlock() {
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

describe('unlockContract with revision overrides', () => {
    it('copies the effective overridden contractType into the unlocked draft revision', async () => {
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
        must(
            await submitContract(client, {
                contractID: draftContract.id,
                submittedByUserID: stateUser.id,
                submittedReason: 'initial submit',
            })
        )
        must(
            await overrideContractData(client, {
                contractID: draftContract.id,
                updatedByID: cmsUser.id,
                description: 'Override contract type',
                overrides: {
                    revisionOverride: {
                        contractType: 'AMENDMENT',
                    },
                },
            })
        )

        const unlockedContract = must(
            await unlockContract(client, {
                contractID: draftContract.id,
                unlockedByUserID: cmsUser.id,
                unlockReason: 'unlock to edit',
            })
        )

        expect(unlockedContract.draftRevision.formData.contractType).toBe(
            'AMENDMENT'
        )
    })

    it('materializes an add-mode contract document override into the unlocked draft', async () => {
        const { client, cmsUser, submittedContract } =
            await setupSubmittedContractWithDocsForUnlock()

        const addedDateAdded = new Date('2025-03-03')
        must(
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

        const unlockedContract = must(
            await unlockContract(client, {
                contractID: submittedContract.id,
                unlockedByUserID: cmsUser.id,
                unlockReason: 'unlock to edit',
            })
        )

        const docs = unlockedContract.draftRevision.formData.contractDocuments
        // Append-at-end semantics: 2 original + 1 added.
        expect(docs).toHaveLength(3)
        // Added doc lands at the end and carries the admin-supplied fields.
        expect(docs[2]).toEqual(
            expect.objectContaining({
                name: 'added-cd.pdf',
                s3URL: 's3://bucket/added-cd',
                sha256: 'sha-added',
                dateAdded: addedDateAdded,
            })
        )
        // Originals retain their identity.
        expect(docs[0].name).toBe('cd1.pdf')
        expect(docs[1].name).toBe('cd2.pdf')
    })

    it('does not carry update-mode dateAdded override through unlock', async () => {
        const { client, cmsUser, submittedContract } =
            await setupSubmittedContractWithDocsForUnlock()

        const targetDocID =
            submittedContract.packageSubmissions[0].contractRevision.formData
                .contractDocuments[0].id!

        must(
            await overrideContractData(client, {
                contractID: submittedContract.id,
                updatedByID: cmsUser.id,
                description: 'Update an existing doc dateAdded',
                overrides: {
                    revisionOverride: {
                        contractDocuments: [
                            {
                                documentID: targetDocID,
                                dateAdded: new Date('2025-04-04'),
                            },
                        ],
                    },
                },
            })
        )

        const unlockedContract = must(
            await unlockContract(client, {
                contractID: submittedContract.id,
                unlockedByUserID: cmsUser.id,
                unlockReason: 'unlock to edit',
            })
        )

        // Update-mode dateAdded overrides are intentionally NOT carried
        // through unlock (matches rate-side behavior). The override's
        // effect on dateAdded is restored at resubmit by the sha256 trace
        // in submitContractAndOrRates.
        const docs = unlockedContract.draftRevision.formData.contractDocuments
        const targetDoc = docs.find((d) => d.name === 'cd1.pdf')
        expect(targetDoc?.dateAdded).toBeUndefined()
        expect(docs).toHaveLength(2)
    })

    it('accumulates document overrides from multiple override rows at unlock', async () => {
        const { client, cmsUser, submittedContract } =
            await setupSubmittedContractWithDocsForUnlock()

        const targetDocID =
            submittedContract.packageSubmissions[0].contractRevision.formData
                .contractDocuments[1].id!

        // Override 1: add a doc.
        must(
            await overrideContractData(client, {
                contractID: submittedContract.id,
                updatedByID: cmsUser.id,
                description: 'Override 1: add a doc',
                overrides: {
                    revisionOverride: {
                        contractDocuments: [
                            {
                                name: 'added.pdf',
                                s3URL: 's3://bucket/added',
                                sha256: 'sha-added',
                                dateAdded: new Date('2025-05-05'),
                            },
                        ],
                    },
                },
            })
        )

        // Override 2: update a different existing doc's dateAdded.
        must(
            await overrideContractData(client, {
                contractID: submittedContract.id,
                updatedByID: cmsUser.id,
                description: 'Override 2: update dateAdded',
                overrides: {
                    revisionOverride: {
                        contractDocuments: [
                            {
                                documentID: targetDocID,
                                dateAdded: new Date('2025-06-06'),
                            },
                        ],
                    },
                },
            })
        )

        const unlockedContract = must(
            await unlockContract(client, {
                contractID: submittedContract.id,
                unlockedByUserID: cmsUser.id,
                unlockReason: 'unlock to edit',
            })
        )

        const docs = unlockedContract.draftRevision.formData.contractDocuments
        // 2 original + 1 added from override #1.
        expect(docs).toHaveLength(3)

        // Effect from override #1: added doc is present with its dateAdded.
        const addedDoc = docs.find((d) => d.name === 'added.pdf')
        expect(addedDoc?.dateAdded).toStrictEqual(new Date('2025-05-05'))

        // Effect from override #2 is intentionally NOT visible at unlock
        // time — update-mode dateAdded is restored at resubmit, not here.
        const updatedTargetDoc = docs.find((d) => d.name === 'cd2.pdf')
        expect(updatedTargetDoc?.dateAdded).toBeUndefined()
    })

    it('preserves an add-override admin-supplied dateAdded across unlock and resubmit', async () => {
        const { client, stateUser, cmsUser, submittedContract } =
            await setupSubmittedContractWithDocsForUnlock()

        const adminDateAdded = new Date('2025-07-07')
        must(
            await overrideContractData(client, {
                contractID: submittedContract.id,
                updatedByID: cmsUser.id,
                description: 'Add a contract document via override',
                overrides: {
                    revisionOverride: {
                        contractDocuments: [
                            {
                                name: 'lifecycle-added.pdf',
                                s3URL: 's3://bucket/lifecycle-added',
                                sha256: 'sha-lifecycle',
                                dateAdded: adminDateAdded,
                            },
                        ],
                    },
                },
            })
        )

        must(
            await unlockContract(client, {
                contractID: submittedContract.id,
                unlockedByUserID: cmsUser.id,
                unlockReason: 'unlock to edit',
            })
        )

        const resubmittedContract = must(
            await submitContract(client, {
                contractID: submittedContract.id,
                submittedByUserID: stateUser.id,
                submittedReason: 'resubmit after override',
            })
        )

        // After resubmit, the submit-side prevDocs trace should have found
        // the admin-supplied dateAdded on the previous revision's
        // add-override row (keyed by sha256) and used it on the new
        // submission, instead of falling back to currentDateTime.
        const latestRev =
            resubmittedContract.packageSubmissions[0].contractRevision
        const addedDoc = latestRev.formData.contractDocuments.find(
            (d) => d.name === 'lifecycle-added.pdf'
        )
        expect(addedDoc).toBeDefined()
        expect(addedDoc?.dateAdded).toStrictEqual(adminDateAdded)
    })
})
