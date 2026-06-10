import { sharedTestPrismaClient } from '../../testHelpers/storeHelpers'
import { constructTestPostgresServer } from '../../testHelpers/gqlHelpers'
import { testStateUser } from '../../testHelpers/userHelpers'
import { createAndSubmitTestContractWithRate } from '../../testHelpers/gqlContractHelpers'
import { must } from '../../testHelpers'
import { findDocumentById } from '.'
import { NotFoundError } from '..'
import { overrideContractData } from '../contractAndRates/overrideContractData'
import { v4 as uuidv4 } from 'uuid'

describe('findDocumentById', () => {
    it('returns document with documentType specified', async () => {
        const client = await sharedTestPrismaClient()

        const stateServer = await constructTestPostgresServer({
            context: {
                user: testStateUser(),
            },
        })

        const contract = await createAndSubmitTestContractWithRate(stateServer)

        const fetchedDoc = must(
            await findDocumentById(
                client,
                contract.packageSubmissions[0].contractRevision.formData
                    .contractDocuments[0].id!,
                'CONTRACT_DOC'
            )
        )

        expect(fetchedDoc.id).toEqual(
            contract.packageSubmissions[0].contractRevision.formData
                .contractDocuments[0].id
        )
        expect(fetchedDoc.name).toEqual(
            contract.packageSubmissions[0].contractRevision.formData
                .contractDocuments[0].name
        )
    })

    it('returns document without documentType specified', async () => {
        const client = await sharedTestPrismaClient()

        const stateServer = await constructTestPostgresServer({
            context: {
                user: testStateUser(),
            },
        })

        const contract = await createAndSubmitTestContractWithRate(stateServer)

        const fetchedDoc = must(
            await findDocumentById(
                client,
                contract.packageSubmissions[0].contractRevision.formData
                    .contractDocuments[0].id!
            )
        )

        expect(fetchedDoc.id).toEqual(
            contract.packageSubmissions[0].contractRevision.formData
                .contractDocuments[0].id
        )
        expect(fetchedDoc.name).toEqual(
            contract.packageSubmissions[0].contractRevision.formData
                .contractDocuments[0].name
        )
    })

    it('returns an override-added document when queried by an ADD document row id', async () => {
        const client = await sharedTestPrismaClient()

        const stateServer = await constructTestPostgresServer({
            context: {
                user: testStateUser(),
            },
        })

        const contract = await createAndSubmitTestContractWithRate(stateServer)
        const cmsUser = await client.user.create({
            data: {
                id: uuidv4(),
                givenName: 'CMS',
                familyName: 'User',
                email: `cms-${uuidv4()}@example.com`,
                role: 'CMS_USER',
            },
        })
        const addedDoc = {
            name: 'override-added-contract-doc.pdf',
            s3URL: 's3://bucket/override-added-contract-doc.pdf',
            s3BucketName: 'bucket',
            s3Key: 'allusers/override-added-contract-doc.pdf',
            sha256: `sha-added-${uuidv4()}`,
        }

        must(
            await overrideContractData(client, {
                contractID: contract.id,
                updatedByID: cmsUser.id,
                description: 'Add override document',
                overrides: {
                    revisionOverride: {
                        contractDocuments: [
                            {
                                documentOp: 'ADD',
                                documentSha256: addedDoc.sha256,
                                name: addedDoc.name,
                                s3URL: addedDoc.s3URL,
                                s3BucketName: addedDoc.s3BucketName,
                                s3Key: addedDoc.s3Key,
                                sha256: addedDoc.sha256,
                                dateAddedOp: 'OVERRIDE',
                                dateAdded: new Date('2025-02-02'),
                            },
                        ],
                    },
                },
            })
        )

        const addRow = await client.contractDocumentOverride.findFirst({
            where: {
                documentOp: 'ADD',
                documentSha256: addedDoc.sha256,
            },
            orderBy: { createdAt: 'desc' },
        })
        expect(addRow).toBeDefined()

        const fetchedDoc = must(
            await findDocumentById(client, addRow!.id, 'CONTRACT_DOC')
        )

        expect(fetchedDoc).toMatchObject({
            id: addRow!.id,
            name: addedDoc.name,
            s3URL: addedDoc.s3URL,
            s3BucketName: addedDoc.s3BucketName,
            s3Key: addedDoc.s3Key,
            sha256: addedDoc.sha256,
        })
    })

    it('returns a NotFoundError when queried by a DELETE document row id', async () => {
        const client = await sharedTestPrismaClient()

        const stateServer = await constructTestPostgresServer({
            context: {
                user: testStateUser(),
            },
        })

        const contract = await createAndSubmitTestContractWithRate(stateServer)
        const cmsUser = await client.user.create({
            data: {
                id: uuidv4(),
                givenName: 'CMS',
                familyName: 'User',
                email: `cms-${uuidv4()}@example.com`,
                role: 'CMS_USER',
            },
        })
        const baseDoc =
            contract.packageSubmissions[0].contractRevision.formData
                .contractDocuments[0]
        const baseDocID = baseDoc.id!

        must(
            await overrideContractData(client, {
                contractID: contract.id,
                updatedByID: cmsUser.id,
                description: 'Delete base document as override',
                overrides: {
                    revisionOverride: {
                        contractDocuments: [
                            {
                                documentOp: 'DELETE',
                                documentID: baseDocID,
                                documentSha256: baseDoc.sha256,
                            },
                        ],
                    },
                },
            })
        )

        const deleteRow = await client.contractDocumentOverride.findFirst({
            where: {
                documentOp: 'DELETE',
                documentID: baseDocID,
                documentSha256: baseDoc.sha256,
            },
            orderBy: { createdAt: 'desc' },
        })
        expect(deleteRow).toBeDefined()

        // This checks lookup by the DELETE override row id. A lookup by the
        // original base document id still returns the stored base document.
        const fetchedDoc = await findDocumentById(
            client,
            deleteRow!.id,
            'CONTRACT_DOC'
        )

        expect(fetchedDoc).toBeInstanceOf(NotFoundError)

        // Override deletes only affect effective form data; direct base document
        // lookup still returns the stored base row.
        const baseFetchedDoc = must(
            await findDocumentById(client, baseDocID, 'CONTRACT_DOC')
        )
        expect(baseFetchedDoc.id).toEqual(baseDocID)
        expect(baseFetchedDoc.name).toEqual(baseDoc.name)
    })
})
