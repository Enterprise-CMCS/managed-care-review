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
import { submitTestContract } from '../../testHelpers/gqlContractHelpers'
import { mockGqlContractDraftRevisionFormDataInput } from '../../testHelpers'

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
                eqroNewContractor: null,
                eqroProvisionMcoNewOptionalActivity: null,
                eqroProvisionNewMcoEqrRelatedActivities: null,
                eqroProvisionChipEqrRelatedActivities: null,
                eqroProvisionMcoEqrOrRelatedActivities: null,
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
                                s3URL: 's3://bucketname/key/contractDocument1.pdf',
                                sha256: 'needs-to-be-there',
                            },
                            {
                                name: 'contractDocument1.pdf',
                                s3URL: 's3://bucketname/key/contractDocument1.pdf',
                                sha256: 'needs-to-be-there',
                            },
                        ],
                        supportingDocuments: [
                            {
                                name: 'supportingDocument11.pdf',
                                s3URL: 's3://bucketname/key/supportingDocument11.pdf',
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

            expect(updatedFormData.supportingDocuments).toEqual(
                expect.arrayContaining(updatedFormData.supportingDocuments)
            )
            expect(updatedFormData.contractDocuments).toEqual(
                expect.arrayContaining(updatedFormData.contractDocuments)
            )

            expect(updatedFormData.stateContacts).toEqual(
                expect.arrayContaining(updatedFormData.stateContacts)
            )
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
    })
})
