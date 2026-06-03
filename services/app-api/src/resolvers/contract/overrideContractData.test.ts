import type { ApolloServer } from '@apollo/server'
import { v4 as uuidv4 } from 'uuid'
import {
    constructTestPostgresServer,
    executeGraphQLOperation,
} from '../../testHelpers/gqlHelpers'
import {
    createAndSubmitTestContractWithRate,
    createTestContract,
    overrideTestContractData,
} from '../../testHelpers/gqlContractHelpers'
import { testAdminUser, testCMSUser } from '../../testHelpers/userHelpers'
import { testLDService } from '../../testHelpers/launchDarklyHelpers'
import { OverrideContractDataDocument } from '../../gen/gqlClient'
import { assertAnErrorCode } from '../../testHelpers'
import type { GenericDocument } from '../../gen/gqlServer'

describe('overrideContractData resolver', () => {
    const ldService = testLDService({
        'rate-edit-unlock': true,
    })

    let stateServer: ApolloServer
    let cmsServer: ApolloServer
    let adminServer: ApolloServer

    beforeAll(async () => {
        stateServer = await constructTestPostgresServer({ ldService })
        cmsServer = await constructTestPostgresServer({
            context: {
                user: testCMSUser(),
            },
            ldService,
        })
        adminServer = await constructTestPostgresServer({
            context: {
                user: testAdminUser(),
            },
            ldService,
        })
    })

    it('rejects non-admin users', async () => {
        const submittedContract =
            await createAndSubmitTestContractWithRate(stateServer)

        const result = await executeGraphQLOperation(stateServer, {
            query: OverrideContractDataDocument,
            variables: {
                input: {
                    contractID: submittedContract.id,
                    description: 'Override contract type',
                    overrides: {
                        revisionOverride: {
                            contractType: 'AMENDMENT',
                            contractTypeOp: 'OVERRIDE',
                        },
                    },
                },
            },
        })

        expect(result.errors?.[0]?.extensions?.code).toBe('FORBIDDEN')
    })

    it('rejects CMS users', async () => {
        const submittedContract =
            await createAndSubmitTestContractWithRate(stateServer)

        const result = await executeGraphQLOperation(cmsServer, {
            query: OverrideContractDataDocument,
            variables: {
                input: {
                    contractID: submittedContract.id,
                    description: 'Override contract type',
                    overrides: {
                        revisionOverride: {
                            contractType: 'AMENDMENT',
                            contractTypeOp: 'OVERRIDE',
                        },
                    },
                },
            },
        })

        expect(assertAnErrorCode(result)).toBe('FORBIDDEN')
    })

    it('creates a contract override and returns effective contract data', async () => {
        const submittedContract =
            await createAndSubmitTestContractWithRate(stateServer)

        const result = await overrideTestContractData(adminServer, {
            contractID: submittedContract.id,
            description: 'Override contract type',
            overrides: {
                revisionOverride: {
                    contractType: 'AMENDMENT',
                    contractTypeOp: 'OVERRIDE',
                },
            },
        })

        expect(
            result.packageSubmissions[0].contractRevision.formData.contractType
        ).toBe('AMENDMENT')
    })

    it('creates a contract initiallySubmittedAt override and returns effective contract data', async () => {
        const submittedContract =
            await createAndSubmitTestContractWithRate(stateServer)
        const overrideDate = '2020-01-15T00:00:00.000Z'

        const result = await overrideTestContractData(adminServer, {
            contractID: submittedContract.id,
            description: 'Override initiallySubmittedAt',
            overrides: {
                initiallySubmittedAt: overrideDate,
                initiallySubmittedAtOp: 'OVERRIDE',
            },
        })

        expect(new Date(result.initiallySubmittedAt!).toISOString()).toBe(
            overrideDate
        )
    })

    it('clears a contract initiallySubmittedAt override and returns the original effective submit date', async () => {
        const submittedContract =
            await createAndSubmitTestContractWithRate(stateServer)
        if (!submittedContract.initiallySubmittedAt) {
            throw new Error('Expected submitted contract to have a submit date')
        }
        const originalInitiallySubmittedAt = new Date(
            submittedContract.initiallySubmittedAt
        ).toISOString()
        const overrideDate = '2020-01-15T00:00:00.000Z'

        const overrideResult = await overrideTestContractData(adminServer, {
            contractID: submittedContract.id,
            description: 'Override initiallySubmittedAt',
            overrides: {
                initiallySubmittedAt: overrideDate,
                initiallySubmittedAtOp: 'OVERRIDE',
            },
        })

        expect(
            new Date(overrideResult.initiallySubmittedAt!).toISOString()
        ).toBe(overrideDate)

        const clearResult = await overrideTestContractData(adminServer, {
            contractID: submittedContract.id,
            description: 'Clear initiallySubmittedAt override',
            overrides: {
                initiallySubmittedAtOp: 'CLEAR_OVERRIDE',
            },
        })

        expect(new Date(clearResult.initiallySubmittedAt!).toISOString()).toBe(
            originalInitiallySubmittedAt
        )
    })

    it('returns BAD_USER_INPUT for invalid override input', async () => {
        const submittedContract =
            await createAndSubmitTestContractWithRate(stateServer)

        const result = await executeGraphQLOperation(adminServer, {
            query: OverrideContractDataDocument,
            variables: {
                input: {
                    contractID: submittedContract.id,
                    description: 'Invalid contract type override',
                    overrides: {
                        revisionOverride: {
                            contractTypeOp: 'OVERRIDE',
                        },
                    },
                },
            },
        })

        expect(assertAnErrorCode(result)).toBe('BAD_USER_INPUT')
    })

    it('returns BAD_USER_INPUT when the contract is not in an overridable status', async () => {
        const draftContract = await createTestContract(stateServer)

        const result = await executeGraphQLOperation(adminServer, {
            query: OverrideContractDataDocument,
            variables: {
                input: {
                    contractID: draftContract.id,
                    description: 'Override draft contract',
                    overrides: {
                        revisionOverride: {
                            contractType: 'AMENDMENT',
                            contractTypeOp: 'OVERRIDE',
                        },
                    },
                },
            },
        })

        expect(assertAnErrorCode(result)).toBe('BAD_USER_INPUT')
        expect(result.errors?.[0]?.message).toContain(
            'contract consolidated status must be SUBMITTED, RESUBMITTED, or APPROVED'
        )
    })

    it('returns NOT_FOUND when the contract does not exist', async () => {
        const result = await executeGraphQLOperation(adminServer, {
            query: OverrideContractDataDocument,
            variables: {
                input: {
                    contractID: uuidv4(),
                    description: 'Missing contract',
                    overrides: {
                        revisionOverride: {
                            contractType: 'AMENDMENT',
                            contractTypeOp: 'OVERRIDE',
                        },
                    },
                },
            },
        })

        expect(assertAnErrorCode(result)).toBe('NOT_FOUND')
    })

    it('applies contract document overrides through the resolver', async () => {
        const submittedContract =
            await createAndSubmitTestContractWithRate(stateServer)
        const latestRevision =
            submittedContract.packageSubmissions[0].contractRevision
        const targetDoc = latestRevision.formData.contractDocuments[0]
        const overrideDate = '2025-04-04T00:00:00.000Z'

        const result = await overrideTestContractData(adminServer, {
            contractID: submittedContract.id,
            description: 'Override contract document dateAdded',
            overrides: {
                revisionOverride: {
                    contractDocuments: [
                        {
                            documentOp: 'OVERRIDE',
                            documentID: targetDoc.id,
                            documentSha256: targetDoc.sha256,
                            dateAdded: overrideDate,
                            dateAddedOp: 'OVERRIDE',
                        },
                    ],
                },
            },
        })

        const returnedDocs =
            result.packageSubmissions[0].contractRevision.formData
                .contractDocuments
        const returnedDoc = returnedDocs.find(
            (doc: GenericDocument) => doc.id === targetDoc.id
        )

        expect(returnedDoc).toBeDefined()
        expect(new Date(returnedDoc!.dateAdded!).toISOString()).toBe(
            overrideDate
        )
    })

    it('clears resolver-created scalar and document overrides back to base data', async () => {
        const submittedContract = await createAndSubmitTestContractWithRate(
            stateServer,
            undefined,
            {
                contractDocuments: [
                    {
                        name: 'base-contract-doc-A.pdf',
                        s3URL: 's3://bucketname/key/base-contract-doc-A.pdf',
                        sha256: 'base-contract-doc-A-sha',
                        dateAdded: new Date('2024-01-01T00:00:00.000Z'),
                    },
                    {
                        name: 'base-contract-doc-B.pdf',
                        s3URL: 's3://bucketname/key/base-contract-doc-B.pdf',
                        sha256: 'base-contract-doc-B-sha',
                        dateAdded: new Date('2024-02-02T00:00:00.000Z'),
                    },
                ],
                supportingDocuments: [
                    {
                        name: 'base-supporting-doc.pdf',
                        s3URL: 's3://bucketname/key/base-supporting-doc.pdf',
                        sha256: 'base-supporting-doc-sha',
                        dateAdded: new Date('2024-03-03T00:00:00.000Z'),
                    },
                ],
            }
        )
        const baseRevision =
            submittedContract.packageSubmissions[0].contractRevision
        const baseContractDocs = baseRevision.formData.contractDocuments
        const baseSupportingDocs = baseRevision.formData.supportingDocuments
        const baseContractDocA = baseContractDocs[0]
        const baseContractDocB = baseContractDocs[1] ?? baseContractDocs[0]
        const baseSupportingDoc = baseSupportingDocs[0]
        const addedContractDocSha = 'resolver-added-contract-doc-sha'
        const addedSupportingDocSha = 'resolver-added-supporting-doc-sha'
        const aOverrideDate = '2025-04-04T00:00:00.000Z'
        const bOverrideDate = '2025-05-05T00:00:00.000Z'

        await overrideTestContractData(adminServer, {
            contractID: submittedContract.id,
            description: 'Override scalar and add documents',
            overrides: {
                revisionOverride: {
                    contractType: 'AMENDMENT',
                    contractTypeOp: 'OVERRIDE',
                    contractDocuments: [
                        {
                            documentOp: 'OVERRIDE',
                            documentID: baseContractDocA.id,
                            documentSha256: baseContractDocA.sha256,
                            dateAdded: aOverrideDate,
                            dateAddedOp: 'OVERRIDE',
                        },
                        {
                            documentOp: 'ADD',
                            documentSha256: addedContractDocSha,
                            name: 'resolver-added-contract-doc.pdf',
                            s3URL: 's3://bucket/resolver-added-contract-doc',
                            s3BucketName: 'bucket',
                            s3Key: 'allusers/resolver-added-contract-doc',
                            sha256: addedContractDocSha,
                        },
                    ],
                    supportingDocuments: [
                        {
                            documentOp: 'ADD',
                            documentSha256: addedSupportingDocSha,
                            name: 'resolver-added-supporting-doc.pdf',
                            s3URL: 's3://bucket/resolver-added-supporting-doc',
                            s3BucketName: 'bucket',
                            s3Key: 'allusers/resolver-added-supporting-doc',
                            sha256: addedSupportingDocSha,
                        },
                    ],
                },
            },
        })

        const secondOverride = await overrideTestContractData(adminServer, {
            contractID: submittedContract.id,
            description: 'Override another base document',
            overrides: {
                revisionOverride: {
                    contractDocuments: [
                        {
                            documentOp: 'OVERRIDE',
                            documentID: baseContractDocB.id,
                            documentSha256: baseContractDocB.sha256,
                            dateAdded: bOverrideDate,
                            dateAddedOp: 'OVERRIDE',
                        },
                    ],
                },
            },
        })

        const overriddenFormData =
            secondOverride.packageSubmissions[0].contractRevision.formData
        const overriddenContractDocs = overriddenFormData.contractDocuments
        const overriddenSupportingDocs = overriddenFormData.supportingDocuments
        expect(overriddenFormData?.contractType).toBe('AMENDMENT')
        expect(overriddenContractDocs).toHaveLength(baseContractDocs.length + 1)
        expect(
            new Date(
                overriddenContractDocs.find(
                    (doc: GenericDocument) => doc.id === baseContractDocA.id
                )!.dateAdded!
            ).toISOString()
        ).toBe(aOverrideDate)
        expect(
            new Date(
                overriddenContractDocs.find(
                    (doc: GenericDocument) => doc.id === baseContractDocB.id
                )!.dateAdded!
            ).toISOString()
        ).toBe(bOverrideDate)
        expect(
            overriddenContractDocs.some(
                (doc: GenericDocument) => doc.sha256 === addedContractDocSha
            )
        ).toBe(true)
        expect(
            overriddenSupportingDocs.some(
                (doc: GenericDocument) => doc.sha256 === addedSupportingDocSha
            )
        ).toBe(true)

        const clearOverrides = await overrideTestContractData(adminServer, {
            contractID: submittedContract.id,
            description: 'Clear all resolver-created overrides',
            overrides: {
                revisionOverride: {
                    contractTypeOp: 'CLEAR_OVERRIDE',
                    contractDocuments: [
                        {
                            documentOp: 'OVERRIDE',
                            documentID: baseContractDocA.id,
                            documentSha256: baseContractDocA.sha256,
                            dateAddedOp: 'CLEAR_OVERRIDE',
                        },
                        {
                            documentOp: 'OVERRIDE',
                            documentID: baseContractDocB.id,
                            documentSha256: baseContractDocB.sha256,
                            dateAddedOp: 'CLEAR_OVERRIDE',
                        },
                        {
                            documentOp: 'DELETE',
                            documentSha256: addedContractDocSha,
                        },
                    ],
                    supportingDocuments: [
                        {
                            documentOp: 'DELETE',
                            documentSha256: addedSupportingDocSha,
                        },
                    ],
                },
            },
        })

        const clearedFormData =
            clearOverrides.packageSubmissions[0].contractRevision.formData
        const clearedContractDocs = clearedFormData.contractDocuments
        const clearedSupportingDocs = clearedFormData.supportingDocuments
        expect(clearedFormData?.contractType).toBe(
            baseRevision.formData.contractType
        )
        expect(clearedContractDocs).toHaveLength(baseContractDocs.length)
        expect(clearedSupportingDocs).toHaveLength(baseSupportingDocs.length)
        expect(
            clearedContractDocs.some(
                (doc: GenericDocument) => doc.sha256 === addedContractDocSha
            )
        ).toBe(false)
        expect(
            clearedSupportingDocs.some(
                (doc: GenericDocument) => doc.sha256 === addedSupportingDocSha
            )
        ).toBe(false)

        const clearedContractDocA = clearedContractDocs?.find(
            (doc: GenericDocument) => doc.id === baseContractDocA.id
        )
        const clearedContractDocB = clearedContractDocs?.find(
            (doc: GenericDocument) => doc.id === baseContractDocB.id
        )
        const clearedSupportingDoc = clearedSupportingDocs?.find(
            (doc: GenericDocument) => doc.id === baseSupportingDoc.id
        )

        expect(new Date(clearedContractDocA!.dateAdded).toISOString()).toBe(
            new Date(baseContractDocA.dateAdded).toISOString()
        )
        expect(new Date(clearedContractDocB!.dateAdded).toISOString()).toBe(
            new Date(baseContractDocB.dateAdded).toISOString()
        )
        expect(clearedSupportingDoc).toEqual(
            expect.objectContaining({
                id: baseSupportingDoc.id,
                name: baseSupportingDoc.name,
                sha256: baseSupportingDoc.sha256,
            })
        )
    })

    it('accepts empty document override arrays without changing effective documents', async () => {
        const submittedContract =
            await createAndSubmitTestContractWithRate(stateServer)
        const originalDocs =
            submittedContract.packageSubmissions[0].contractRevision.formData
                .contractDocuments

        const result = await overrideTestContractData(adminServer, {
            contractID: submittedContract.id,
            description: 'Empty document override arrays',
            overrides: {
                revisionOverride: {
                    contractDocuments: [],
                    supportingDocuments: [],
                },
            },
        })

        expect(
            result.packageSubmissions[0].contractRevision.formData
                .contractDocuments
        ).toHaveLength(originalDocs.length)
    })
})
