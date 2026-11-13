import { NewPostgresStore } from '../../postgres'
import { UpdateContractDraftRevisionDocument } from '../../gen/gqlClient'
import {
    mockStoreThatErrors,
    sharedTestPrismaClient,
} from '../../testHelpers/storeHelpers'
import {
    constructTestPostgresServer,
    executeGraphQLOperation,
} from '../../testHelpers/gqlHelpers'
import { testCMSUser, testStateUser } from '../../testHelpers/userHelpers'
import {
    createAndUpdateTestEQROContract,
    createTestContract,
    updateTestContractDraftRevision,
} from '../../testHelpers'
import type { ContractDraftRevisionFormDataInput } from '../../gen/gqlServer'
import { testLDService } from '../../testHelpers/launchDarklyHelpers'
import {
    createAndUpdateTestEBContract,
    fetchTestContract,
    submitTestContract,
} from '../../testHelpers/gqlContractHelpers'
import { mockGqlContractDraftRevisionFormDataInput } from '../../testHelpers'
import type { ApolloServer } from '@apollo/server'

describe(`Tests UpdateContractDraftRevision`, () => {
    const cmsUser = testCMSUser()

    const validEmptyFormData: ContractDraftRevisionFormDataInput = {
        programIDs: [],
        federalAuthorities: [],
        managedCareEntities: [],
        submissionType: 'CONTRACT_ONLY',
        stateContacts: [],
        contractDocuments: [],
        supportingDocuments: [],
    }

    afterEach(() => {
        vi.resetAllMocks()
    })

    describe('Health plan contract tests', () => {
        it('updates valid scalar fields in the formData', async () => {
            const mockLDService = testLDService({ '438-attestation': true })
            const server = await constructTestPostgresServer({
                ldService: mockLDService,
            })
            const draftContract = await createTestContract(server)
            const draftRevision = draftContract.draftRevision

            if (!draftRevision) {
                throw new Error(
                    'Unexpected error: Draft contract did not contain a draft revision'
                )
            }

            // validate contract submission type
            expect(draftContract.contractSubmissionType).toBe('HEALTH_PLAN')

            const testContact = {
                givenName: 'Jane',
                familyName: 'Doe',
                suffix: 'Jr.',
                titleRole: 'Contract Manager',
                email: 'jane.doe@example.com',
            }

            // update that draft.
            const updateFormData: ContractDraftRevisionFormDataInput =
                mockGqlContractDraftRevisionFormDataInput(
                    draftContract.stateCode,
                    {
                        modifiedNetworkAdequacyStandards: undefined,
                        modifiedLengthOfContract: undefined,
                        modifiedNonRiskPaymentArrangements: undefined,
                        contractDocuments: [],
                        supportingDocuments: [],
                        stateContacts: [testContact],
                    }
                )
            const updateResult = await updateTestContractDraftRevision(
                server,
                draftContract.id,
                draftRevision.updatedAt,
                updateFormData
            )

            const updatedFormData = updateResult.draftRevision?.formData

            expect(updatedFormData).toEqual({
                ...updateFormData,
                dsnpContract: null,
                modifiedNetworkAdequacyStandards: null,
                modifiedLengthOfContract: null,
                modifiedNonRiskPaymentArrangements: null,
                statutoryRegulatoryAttestationDescription: null,
                procurementAttestation: null,
                eqroNewContractor: null,
                eqroProvisionMcoNewOptionalActivity: null,
                eqroProvisionNewMcoEqrRelatedActivities: null,
                eqroProvisionChipEqrRelatedActivities: null,
                eqroProvisionMcoEqrOrRelatedActivities: null,
                ebContractorID: null,
                ebLinkedBaseContractID: null,
                ebLinkedPreviousAmendmentID: null,
                ebNewContractor: null,
                ebBaseContractInMCReview: null,
                ebPreviousAmendmentInMCReview: null,
                ebAmendmentNumber: null,
                ebStateContractIdentifier: null,
                stateContacts: [
                    {
                        name: `${testContact.givenName} ${testContact.familyName}`,
                        ...testContact,
                    },
                ],
            })
        })

        it('updates relational fields such as documents and contacts', async () => {
            const server = await constructTestPostgresServer()
            const draftContract = await createTestContract(server)
            const draftRevision = draftContract.draftRevision

            if (!draftRevision) {
                throw new Error(
                    'Unexpected error: Draft contract did not contain a draft revision'
                )
            }

            // update that draft.
            const updateFormData: ContractDraftRevisionFormDataInput =
                mockGqlContractDraftRevisionFormDataInput(
                    draftContract.stateCode,
                    {
                        stateContacts: [
                            {
                                name: 'statecontact',
                                titleRole: 'thestatestofcontacts',
                                email: 'statemcstate@examepl.com',
                            },
                        ],
                        contractDocuments: [
                            {
                                name: 'contractDocument1.pdf',
                                s3URL: 's3://legacy-documents/key/contractDocument1.pdf',
                                sha256: 'needs-to-be-there',
                            },
                            {
                                name: 'contractDocument1.pdf',
                                s3URL: 's3://legacy-documents/key/contractDocument1.pdf',
                                sha256: 'needs-to-be-there',
                            },
                        ],
                        supportingDocuments: [
                            {
                                name: 'supportingDocument11.pdf',
                                s3URL: 's3://legacy-documents/key/supportingDocument11.pdf',
                                sha256: 'needs-to-be-there',
                            },
                        ],
                    }
                )

            const updateResult = await updateTestContractDraftRevision(
                server,
                draftContract.id,
                draftRevision.updatedAt,
                updateFormData
            )

            if (!updateResult.draftRevision) {
                throw new Error(
                    'Unexpected error: Updated draft contract did not contain a draft revision'
                )
            }

            const updatedFormData = updateResult.draftRevision?.formData

            expect(updatedFormData.contractDocuments).toEqual([
                expect.objectContaining({
                    s3URL: 's3://legacy-documents/key/contractDocument1.pdf',
                    s3BucketName: 'bucketname',
                    s3Key: 'allusers/key',
                }),
                expect.objectContaining({
                    s3URL: 's3://legacy-documents/key/contractDocument1.pdf',
                    s3BucketName: 'bucketname',
                    s3Key: 'allusers/key',
                }),
            ])
            expect(updatedFormData.supportingDocuments).toEqual([
                expect.objectContaining({
                    s3URL: 's3://legacy-documents/key/supportingDocument11.pdf',
                    s3BucketName: 'bucketname',
                    s3Key: 'allusers/key',
                }),
            ])

            expect(updatedFormData.stateContacts).toEqual([
                expect.objectContaining({
                    name: 'statecontact',
                    titleRole: 'thestatestofcontacts',
                    email: 'statemcstate@examepl.com',
                }),
            ])
        })

        it('writes givenName, familyName and suffix on state contacts', async () => {
            const server = await constructTestPostgresServer()
            const draftContract = await createTestContract(server)
            const draftRevision = draftContract.draftRevision

            if (!draftRevision) {
                throw new Error(
                    'Unexpected error: Draft contract did not contain a draft revision'
                )
            }

            const testContact = {
                givenName: 'Jane',
                familyName: 'Doe',
                suffix: 'Jr.',
                titleRole: 'Contract Manager',
                email: 'jane.doe@example.com',
            }

            const updateFormData: ContractDraftRevisionFormDataInput = {
                ...mockGqlContractDraftRevisionFormDataInput(
                    draftContract.stateCode
                ),
                stateContacts: [
                    {
                        ...testContact,
                    },
                ],
            }

            const updateResult = await executeGraphQLOperation(server, {
                query: UpdateContractDraftRevisionDocument,
                variables: {
                    input: {
                        contractID: draftContract.id,
                        lastSeenUpdatedAt: draftRevision.updatedAt,
                        formData: updateFormData,
                    },
                },
            })

            expect(updateResult.errors).toBeUndefined()

            const updatedStateContacts =
                updateResult.data?.updateContractDraftRevision.contract
                    .draftRevision?.formData.stateContacts

            // response includes givenName, familyName, suffix and the full name
            // constructed from givenName + familyName only (no suffix).
            expect(updatedStateContacts).toEqual([
                {
                    name: `${testContact.givenName} ${testContact.familyName}`,
                    ...testContact,
                },
            ])
        })

        it('errors if a CMS user calls it', async () => {
            const server = await constructTestPostgresServer()
            const draftContract = await createTestContract(server)

            const draftRevision = draftContract.draftRevision
            if (!draftRevision) {
                throw new Error(
                    'Unexpected error: Draft contract did not contain a draft revision'
                )
            }

            const cmsUserServer = await constructTestPostgresServer({
                context: {
                    user: cmsUser,
                },
            })

            const updateResult = await executeGraphQLOperation(cmsUserServer, {
                query: UpdateContractDraftRevisionDocument,
                variables: {
                    input: {
                        contractID: draftContract.id,
                        lastSeenUpdatedAt: draftRevision.updatedAt,
                        formData: validEmptyFormData,
                    },
                },
            })

            expect(updateResult.errors).toBeDefined()
            if (updateResult.errors === undefined) {
                throw new Error('type narrow')
            }

            expect(updateResult.errors[0].extensions?.code).toBe('FORBIDDEN')
            expect(updateResult.errors[0].message).toBe(
                'User not authorized to modify state data'
            )
        })

        it('errors if a state user from a different state calls it', async () => {
            const server = await constructTestPostgresServer()
            const draftContract = await createTestContract(server)
            const draftRevision = draftContract.draftRevision

            if (!draftRevision) {
                throw new Error(
                    'Unexpected error: Draft contract did not contain a draft revision'
                )
            }

            // setup a server with a different user
            const otherUserServer = await constructTestPostgresServer({
                context: {
                    user: testStateUser({ stateCode: 'VA' }),
                },
            })

            const updateResult = await executeGraphQLOperation(
                otherUserServer,
                {
                    query: UpdateContractDraftRevisionDocument,
                    variables: {
                        input: {
                            contractID: draftContract.id,
                            lastSeenUpdatedAt: draftRevision.updatedAt,
                            formData: validEmptyFormData,
                        },
                    },
                }
            )

            expect(updateResult.errors).toBeDefined()
            if (updateResult.errors === undefined) {
                throw new Error('type narrow')
            }

            expect(updateResult.errors[0].extensions?.code).toBe('FORBIDDEN')
            expect(updateResult.errors[0].message).toBe(
                'User not authorized to fetch data from a different state'
            )
        })

        it('errors if the payload is not valid', async () => {
            const mockLDService = testLDService({ '438-attestation': true })
            const server = await constructTestPostgresServer({
                ldService: mockLDService,
            })
            const draftContract = await createTestContract(server)
            const draftRevision = draftContract.draftRevision

            if (!draftRevision) {
                throw new Error(
                    'Unexpected error: Draft contract did not contain a draft revision'
                )
            }

            // update that draft.
            const formData: ContractDraftRevisionFormDataInput = {
                populationCovered: 'CHIP',
                submissionType: 'CONTRACT_AND_RATES',
                programIDs: [],
                stateContacts: [],
                contractDocuments: [],
                supportingDocuments: [],
                managedCareEntities: ['MCO'],
                federalAuthorities: [],
            }

            const updateResult = await executeGraphQLOperation(server, {
                query: UpdateContractDraftRevisionDocument,
                variables: {
                    input: {
                        contractID: draftContract.id,
                        lastSeenUpdatedAt: draftRevision.updatedAt,
                        formData,
                    },
                },
            })

            expect(updateResult.errors).toBeDefined()
            if (updateResult.errors === undefined) {
                throw new Error('type narrow')
            }

            expect(updateResult.errors[0].extensions?.code).toBe(
                'BAD_USER_INPUT'
            )
            expect(updateResult.errors[0].message).toContain(
                `populationCoveredSchema of CHIP cannot be submissionType of CONTRACT_AND_RATES`
            )
        })

        it('clears dsnpContract when a submission is updated to CHIP-only and chip automation is enabled', async () => {
            const mockLDService = testLDService({
                dsnp: true,
                'chip-submission-automation': true,
            })
            const server = await constructTestPostgresServer({
                ldService: mockLDService,
            })
            const draftContract = await createTestContract(server)
            const draftRevision = draftContract.draftRevision

            if (!draftRevision) {
                throw new Error(
                    'Unexpected error: Draft contract did not contain a draft revision'
                )
            }

            const updateFormData: ContractDraftRevisionFormDataInput = {
                ...mockGqlContractDraftRevisionFormDataInput(
                    draftContract.stateCode,
                    {
                        populationCovered: 'CHIP',
                        dsnpContract: true,
                        federalAuthorities: ['STATE_PLAN'],
                    }
                ),
            }

            const updateResult = await updateTestContractDraftRevision(
                server,
                draftContract.id,
                draftRevision.updatedAt,
                updateFormData
            )

            expect(updateResult.draftRevision?.formData.dsnpContract).toBeNull()
            expect(updateResult.draftRevision?.formData.populationCovered).toBe(
                'CHIP'
            )
        })

        it('errors if the Contract is already submitted', async () => {
            const server = await constructTestPostgresServer()
            const draftContract = await createTestContract(server)
            const contractID = draftContract.id
            const updatedDraftContract = await updateTestContractDraftRevision(
                server,
                contractID
            )
            await submitTestContract(server, contractID)

            // Now test updating a submitted submission
            const updateResult = await executeGraphQLOperation(server, {
                query: UpdateContractDraftRevisionDocument,
                variables: {
                    input: {
                        contractID,
                        lastSeenUpdatedAt: updatedDraftContract.updatedAt,
                        formData: validEmptyFormData,
                    },
                },
            })

            expect(updateResult.errors).toBeDefined()
            if (updateResult.errors === undefined) {
                throw new Error('type narrow')
            }

            expect(updateResult.errors[0].extensions?.code).toBe(
                'BAD_USER_INPUT'
            )
            expect(updateResult.errors[0].message).toContain(
                `Contract is not in editable state. Contract: ${contractID} Status: SUBMITTED`
            )
        })

        it('errors on concurrent updates', async () => {
            const server = await constructTestPostgresServer()
            const draftContract = await createTestContract(server)
            const draftRevision = draftContract.draftRevision
            const contractID = draftContract.id

            if (!draftRevision) {
                throw new Error(
                    'Unexpected error: Draft contract did not contain a draft revision'
                )
            }

            // Update the draft to have complete data for submission.
            const updateResult = await executeGraphQLOperation(server, {
                query: UpdateContractDraftRevisionDocument,
                variables: {
                    input: {
                        contractID: contractID,
                        lastSeenUpdatedAt: new Date(1999, 11, 12),
                        formData: validEmptyFormData,
                    },
                },
            })

            expect(updateResult.errors).toBeDefined()
            if (updateResult.errors === undefined) {
                throw new Error('type narrow')
            }

            expect(updateResult.errors[0].extensions?.code).toBe(
                'BAD_USER_INPUT'
            )

            const expectedErrorMsg =
                'Concurrent update error: The data you are trying to modify has changed since you last retrieved it. Please refresh the page to continue.'

            expect(updateResult.errors[0].message).toBe(expectedErrorMsg)
        })

        it('errors if the update call to the db fails', async () => {
            const prismaClient = await sharedTestPrismaClient()
            const postgresStore = NewPostgresStore(prismaClient)
            const failStore = mockStoreThatErrors()

            // set store error for flag on.
            postgresStore.updateDraftContract = failStore.updateDraftContract

            const server = await constructTestPostgresServer({
                store: postgresStore,
            })
            const draftContract = await createTestContract(server)
            const draftRevision = draftContract.draftRevision
            const contractID = draftContract.id

            if (!draftRevision) {
                throw new Error(
                    'Unexpected error: Draft contract did not contain a draft revision'
                )
            }

            // Update the draft to have complete data for submission.
            const updateResult = await executeGraphQLOperation(server, {
                query: UpdateContractDraftRevisionDocument,
                variables: {
                    input: {
                        contractID: contractID,
                        lastSeenUpdatedAt: draftRevision.updatedAt,
                        formData: validEmptyFormData,
                    },
                },
            })

            expect(updateResult.errors).toBeDefined()
            if (updateResult.errors === undefined) {
                throw new Error('type narrow')
            }

            expect(updateResult.errors[0].extensions?.code).toBe(
                'INTERNAL_SERVER_ERROR'
            )
            expect(updateResult.errors[0].message).toContain(
                'UNEXPECTED_EXCEPTION'
            )
            expect(updateResult.errors[0].message).toContain(
                'Error updating form data'
            )
        })
    })

    describe('Enrollment Broker contract tests', () => {
        const createEBLinkedContractFields = async (server: ApolloServer) => {
            const base = await createAndUpdateTestEBContract(server, 'FL', {
                contractType: 'BASE',
            })
            await submitTestContract(server, base.id)
            const amendment = await createAndUpdateTestEBContract(server, 'FL')
            await submitTestContract(server, amendment.id)

            return {
                ebLinkedBaseContractID: base.id,
                ebLinkedPreviousAmendmentID: amendment.id,
            }
        }

        it('updates EB scalar fields and linked contract IDs in the formData', async () => {
            const server = await constructTestPostgresServer()
            const draft = await createAndUpdateTestEBContract(server)
            const ebFields = {
                ebContractorID: '4c70e567-819b-4d6f-b005-d6ae966246cb',
                ...(await createEBLinkedContractFields(server)),
                ebNewContractor: false,
                ebBaseContractInMCReview: true,
                ebPreviousAmendmentInMCReview: false,
                ebAmendmentNumber: 'Amendment 3',
                ebStateContractIdentifier: 'EB-2026-002',
            }

            const updated = await updateTestContractDraftRevision(
                server,
                draft.id,
                draft.draftRevision?.updatedAt,
                mockGqlContractDraftRevisionFormDataInput(draft.stateCode, {
                    contractType: 'AMENDMENT',
                    ...ebFields,
                })
            )

            expect(updated.contractSubmissionType).toBe('ENROLLMENT_BROKER')
            expect(updated.draftRevision?.formData).toEqual(
                expect.objectContaining(ebFields)
            )
            const fetched = await fetchTestContract(server, draft.id)
            expect(fetched.draftRevision?.formData).toEqual(
                expect.objectContaining(ebFields)
            )
        })

        describe.each([
            'ebLinkedBaseContractID',
            'ebLinkedPreviousAmendmentID',
        ] as const)('%s validation', (field) => {
            it.each(['', '   ', '00000000-0000-4000-8000-000000000000'])(
                'rejects an empty or nonexistent linked ID (%j) without updating the draft',
                async (linkedID) => {
                    const server = await constructTestPostgresServer()
                    const draft = await createAndUpdateTestEBContract(server)
                    const result = await executeGraphQLOperation(server, {
                        query: UpdateContractDraftRevisionDocument,
                        variables: {
                            input: {
                                contractID: draft.id,
                                lastSeenUpdatedAt:
                                    draft.draftRevision!.updatedAt,
                                formData:
                                    mockGqlContractDraftRevisionFormDataInput(
                                        draft.stateCode,
                                        {
                                            contractType: 'AMENDMENT',
                                            submissionDescription:
                                                'Must not be saved',
                                            [field]: linkedID,
                                        }
                                    ),
                            },
                        },
                    })

                    expect(result.errors).toHaveLength(1)
                    expect(result.errors?.[0]).toEqual(
                        expect.objectContaining({
                            message: `${field} must reference an existing contract`,
                            extensions: expect.objectContaining({
                                code: 'BAD_USER_INPUT',
                                argumentName: field,
                            }),
                        })
                    )
                    const fetched = await fetchTestContract(server, draft.id)
                    expect(fetched.draftRevision?.formData).toEqual(
                        draft.draftRevision?.formData
                    )
                    expect(fetched.draftRevision?.updatedAt).toEqual(
                        draft.draftRevision?.updatedAt
                    )
                }
            )
            it('returns a server error when the linked-contract lookup fails', async () => {
                const postgresStore = NewPostgresStore(
                    await sharedTestPrismaClient()
                )
                const failedID = '00000000-0000-4000-8000-000000000001'
                const updateDraftContract = vi.fn(
                    postgresStore.updateDraftContract
                )
                const server = await constructTestPostgresServer({
                    store: {
                        updateDraftContract,
                        findContractWithHistory: async (id) =>
                            id === failedID
                                ? new Error('Database unavailable')
                                : postgresStore.findContractWithHistory(id),
                    },
                })
                const draft = await createAndUpdateTestEBContract(server)
                updateDraftContract.mockClear()

                const result = await executeGraphQLOperation(server, {
                    query: UpdateContractDraftRevisionDocument,
                    variables: {
                        input: {
                            contractID: draft.id,
                            lastSeenUpdatedAt: draft.draftRevision!.updatedAt,
                            formData: mockGqlContractDraftRevisionFormDataInput(
                                draft.stateCode,
                                { [field]: failedID }
                            ),
                        },
                    },
                })

                expect(result.errors).toHaveLength(1)
                expect(result.errors?.[0].extensions).toEqual(
                    expect.objectContaining({
                        code: 'INTERNAL_SERVER_ERROR',
                        cause: 'DB_ERROR',
                    })
                )
                expect(updateDraftContract).not.toHaveBeenCalled()
            })
        })

        it.each([null, undefined])(
            'clears optional EB fields when updated with %s',
            async (emptyValue) => {
                const server = await constructTestPostgresServer()
                const linkedFields = await createEBLinkedContractFields(server)
                const draft = await createAndUpdateTestEBContract(
                    server,
                    'FL',
                    linkedFields
                )
                expect(draft.draftRevision?.formData).toEqual(
                    expect.objectContaining(linkedFields)
                )

                const updated = await updateTestContractDraftRevision(
                    server,
                    draft.id,
                    draft.draftRevision?.updatedAt,
                    mockGqlContractDraftRevisionFormDataInput(draft.stateCode, {
                        contractType: 'AMENDMENT',
                        ebNewContractor: emptyValue,
                        ebBaseContractInMCReview: emptyValue,
                        ebPreviousAmendmentInMCReview: emptyValue,
                        ebAmendmentNumber: emptyValue,
                        ebStateContractIdentifier: emptyValue,
                        ebContractorID: emptyValue,
                        ebLinkedBaseContractID: emptyValue,
                        ebLinkedPreviousAmendmentID: emptyValue,
                    })
                )

                expect(updated.draftRevision?.formData).toEqual(
                    expect.objectContaining({
                        ebNewContractor: null,
                        ebBaseContractInMCReview: null,
                        ebPreviousAmendmentInMCReview: null,
                        ebAmendmentNumber: null,
                        ebStateContractIdentifier: null,
                        ebContractorID: null,
                        ebLinkedBaseContractID: null,
                        ebLinkedPreviousAmendmentID: null,
                    })
                )
            }
        )
    })

    describe('EQRO contract tests', () => {
        it('updates valid EQRO scalar fields in the formData', async () => {
            const mockLDService = testLDService({ '438-attestation': true })
            const server = await constructTestPostgresServer({
                ldService: mockLDService,
            })
            const updateResult = await createAndUpdateTestEQROContract(server)

            const updatedFormData = updateResult.draftRevision?.formData

            expect(updatedFormData).toEqual(
                expect.objectContaining({
                    contractExecutionStatus: 'EXECUTED',
                    eqroNewContractor: true,
                    eqroProvisionMcoNewOptionalActivity: true,
                    eqroProvisionNewMcoEqrRelatedActivities: true,
                    eqroProvisionChipEqrRelatedActivities: true,
                    eqroProvisionMcoEqrOrRelatedActivities: true,
                })
            )
        })
        it('clears out not applicable EQRO fields', async () => {
            const mockLDService = testLDService({ '438-attestation': true })
            const server = await constructTestPostgresServer({
                ldService: mockLDService,
            })
            const contract = await createAndUpdateTestEQROContract(server)

            const formData = contract.draftRevision?.formData

            expect(formData).toEqual(
                expect.objectContaining({
                    eqroNewContractor: true,
                    eqroProvisionMcoNewOptionalActivity: true,
                    eqroProvisionNewMcoEqrRelatedActivities: true,
                    eqroProvisionChipEqrRelatedActivities: true,
                    eqroProvisionMcoEqrOrRelatedActivities: true,
                })
            )

            // Change a EQRO conditional question trigger field
            const updatedContract = await updateTestContractDraftRevision(
                server,
                contract.id,
                contract.draftRevision?.updatedAt,
                mockGqlContractDraftRevisionFormDataInput(contract.stateCode, {
                    ...formData,
                    contractType: 'AMENDMENT',
                })
            )

            const updatedFormData = updatedContract.draftRevision?.formData

            // expect all conditional fields to null out
            expect(updatedFormData).toEqual(
                expect.objectContaining({
                    eqroNewContractor: null,
                    eqroProvisionMcoNewOptionalActivity: null,
                    eqroProvisionNewMcoEqrRelatedActivities: null,
                    eqroProvisionChipEqrRelatedActivities: null,
                    eqroProvisionMcoEqrOrRelatedActivities: null,
                })
            )

            // Update EQRO submission conditional fields
            const updateEQROFields = await updateTestContractDraftRevision(
                server,
                contract.id,
                updatedContract.draftRevision?.updatedAt,
                mockGqlContractDraftRevisionFormDataInput(contract.stateCode, {
                    ...updatedFormData,
                    eqroNewContractor: true,
                    eqroProvisionMcoNewOptionalActivity: false,
                })
            )

            const updatedEQROFormData = updateEQROFields.draftRevision?.formData

            // Expect updated EQRO fields to be retained
            expect(updatedEQROFormData).toEqual(
                expect.objectContaining({
                    eqroNewContractor: true,
                    eqroProvisionMcoNewOptionalActivity: false,
                    eqroProvisionNewMcoEqrRelatedActivities: null,
                    eqroProvisionChipEqrRelatedActivities: null,
                    eqroProvisionMcoEqrOrRelatedActivities: null,
                })
            )
        })
        it('returns an error if EQRO update data is invalid', async () => {
            const mockLDService = testLDService({ '438-attestation': true })
            const server = await constructTestPostgresServer({
                ldService: mockLDService,
            })
            const contract = await createAndUpdateTestEQROContract(server)

            const formData = contract.draftRevision?.formData

            // Update the draft to have complete data for submission.
            const updateResult = await executeGraphQLOperation(server, {
                query: UpdateContractDraftRevisionDocument,
                variables: {
                    input: {
                        contractID: contract.id,
                        lastSeenUpdatedAt: contract.draftRevision?.updatedAt,
                        formData: mockGqlContractDraftRevisionFormDataInput(
                            contract.stateCode,
                            {
                                ...formData,
                                riskBasedContract: true,
                            }
                        ),
                    },
                },
            })

            // Expect errors to be defined and be riskBasedContract error
            expect(updateResult.errors).toBeDefined
            expect(updateResult.errors?.[0].message).toContain(
                'riskBasedContract'
            )
            expect(updateResult.errors?.[0].message).toContain(
                'Invalid input: expected undefined, received boolean'
            )
        })

        it('rejects procurement attestation', async () => {
            const server = await constructTestPostgresServer()
            const contract = await createAndUpdateTestEQROContract(server)
            const formData = contract.draftRevision?.formData

            if (!formData) {
                throw new Error(
                    'Unexpected error: EQRO contract did not contain form data'
                )
            }

            const updateResult = await executeGraphQLOperation(server, {
                query: UpdateContractDraftRevisionDocument,
                variables: {
                    input: {
                        contractID: contract.id,
                        lastSeenUpdatedAt: contract.draftRevision?.updatedAt,
                        formData: mockGqlContractDraftRevisionFormDataInput(
                            contract.stateCode,
                            {
                                ...formData,
                                procurementAttestation: true,
                            }
                        ),
                    },
                },
            })

            expect(updateResult.errors?.[0].message).toContain(
                'procurementAttestation'
            )
            expect(updateResult.errors?.[0].message).toContain(
                'Invalid input: expected undefined, received boolean'
            )
        })
    })
})
