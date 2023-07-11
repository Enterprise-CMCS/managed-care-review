import {
    constructTestPostgresServer,
    createAndSubmitTestHealthPlanPackage,
    createAndUpdateTestHealthPlanPackage,
    createTestHealthPlanPackage,
} from '../../testHelpers/gqlHelpers'
import UPDATE_HEALTH_PLAN_FORM_DATA from '@managed-care-review/app-graphql/src/mutations/updateHealthPlanFormData.graphql'
import {
    base64ToDomain,
    domainToBase64,
} from '@managed-care-review/common-code/proto'
import { latestFormData } from '../../testHelpers/healthPlanPackageHelpers'
import {
    basicLockedHealthPlanFormData,
    basicHealthPlanFormData,
} from '@managed-care-review/common-code/healthPlanFormDataMocks'
import { v4 as uuidv4 } from 'uuid'
import {
    mockStoreThatErrors,
    sharedTestPrismaClient,
} from '../../testHelpers/storeHelpers'
import { NewPostgresStore } from '../../postgres'
import { testCMSUser, testStateUser } from '../../testHelpers/userHelpers'

describe('updateHealthPlanFormData', () => {
    const cmsUser = testCMSUser()

    it('updates valid fields in the formData', async () => {
        const server = await constructTestPostgresServer()

        const createdDraft = await createTestHealthPlanPackage(server)

        const formData = latestFormData(createdDraft)

        // update that draft.
        formData.submissionDescription = 'UPDATED BY REVISION'

        // convert to base64 proto
        const updatedB64 = domainToBase64(formData)

        const updateResult = await server.executeOperation({
            query: UPDATE_HEALTH_PLAN_FORM_DATA,
            variables: {
                input: {
                    pkgID: createdDraft.id,
                    healthPlanFormData: updatedB64,
                },
            },
        })

        expect(updateResult.errors).toBeUndefined()

        const healthPlanPackage =
            updateResult.data?.updateHealthPlanFormData.pkg

        const updatedFormData = latestFormData(healthPlanPackage)
        expect(updatedFormData.submissionDescription).toBe(
            'UPDATED BY REVISION'
        )
    })

    it('errors if a CMS user calls it', async () => {
        const server = await constructTestPostgresServer()

        const createdDraft = await createTestHealthPlanPackage(server)

        const formData = latestFormData(createdDraft)

        // update that draft.
        formData.submissionDescription = 'UPDATED BY REVISION'

        // convert to base64 proto
        const updatedB64 = domainToBase64(formData)

        const cmsUserServer = await constructTestPostgresServer({
            context: {
                user: cmsUser,
            },
        })

        const updateResult = await cmsUserServer.executeOperation({
            query: UPDATE_HEALTH_PLAN_FORM_DATA,
            variables: {
                input: {
                    pkgID: createdDraft.id,
                    healthPlanFormData: updatedB64,
                },
            },
        })

        expect(updateResult.errors).toBeDefined()
        if (updateResult.errors === undefined) {
            throw new Error('type narrow')
        }

        expect(updateResult.errors[0].extensions?.code).toBe('FORBIDDEN')
        expect(updateResult.errors[0].message).toBe(
            'user not authorized to modify state data'
        )
    })

    it('errors if a state user from a different state calls it', async () => {
        const server = await constructTestPostgresServer()
        const createdDraft = await createTestHealthPlanPackage(server)
        const formData = latestFormData(createdDraft)

        // update that draft.
        formData.submissionDescription = 'UPDATED BY REVISION'

        // convert to base64 proto
        const updatedB64 = domainToBase64(formData)

        // setup a server with a different user
        const otherUserServer = await constructTestPostgresServer({
            context: {
                user: testStateUser({ stateCode: 'VA' }),
            },
        })

        const updateResult = await otherUserServer.executeOperation({
            query: UPDATE_HEALTH_PLAN_FORM_DATA,
            variables: {
                input: {
                    pkgID: createdDraft.id,
                    healthPlanFormData: updatedB64,
                },
            },
        })

        expect(updateResult.errors).toBeDefined()
        if (updateResult.errors === undefined) {
            throw new Error('type narrow')
        }

        expect(updateResult.errors[0].extensions?.code).toBe('FORBIDDEN')
        expect(updateResult.errors[0].message).toBe(
            'user not authorized to fetch data from a different state'
        )
    })

    it('errors if the payload isnt valid', async () => {
        const server = await constructTestPostgresServer()

        const createdDraft = await createTestHealthPlanPackage(server)

        const formData = 'not-valid-proto'

        const updateResult = await server.executeOperation({
            query: UPDATE_HEALTH_PLAN_FORM_DATA,
            variables: {
                input: {
                    pkgID: createdDraft.id,
                    healthPlanFormData: formData,
                },
            },
        })

        expect(updateResult.errors).toBeDefined()
        if (updateResult.errors === undefined) {
            throw new Error('type narrow')
        }

        expect(updateResult.errors[0].extensions?.code).toBe('BAD_USER_INPUT')
        expect(updateResult.errors[0].message).toContain(
            'Failed to parse out form data in request'
        )
    })

    it('errors if the payload is submitted', async () => {
        const server = await constructTestPostgresServer()

        const createdDraft = await createTestHealthPlanPackage(server)

        const stateSubmission = basicLockedHealthPlanFormData()

        const formData = domainToBase64(stateSubmission)

        const updateResult = await server.executeOperation({
            query: UPDATE_HEALTH_PLAN_FORM_DATA,
            variables: {
                input: {
                    pkgID: createdDraft.id,
                    healthPlanFormData: formData,
                },
            },
        })

        expect(updateResult.errors).toBeDefined()
        if (updateResult.errors === undefined) {
            throw new Error('type narrow')
        }

        expect(updateResult.errors[0].extensions?.code).toBe('BAD_USER_INPUT')
        expect(updateResult.errors[0].message).toContain(
            'Attempted to update with a StateSubmission'
        )
    })

    it('errors if the Package is already submitted', async () => {
        const server = await constructTestPostgresServer()
        const createdSubmitted = await createAndSubmitTestHealthPlanPackage(
            server
        )

        const draft = basicHealthPlanFormData()
        const b64 = domainToBase64(draft)

        const updateResult = await server.executeOperation({
            query: UPDATE_HEALTH_PLAN_FORM_DATA,
            variables: {
                input: {
                    pkgID: createdSubmitted.id,
                    healthPlanFormData: b64,
                },
            },
        })

        expect(updateResult.errors).toBeDefined()
        if (updateResult.errors === undefined) {
            throw new Error('type narrow')
        }

        expect(updateResult.errors[0].extensions?.code).toBe('BAD_USER_INPUT')
        expect(updateResult.errors[0].message).toContain(
            'Package is not in editable state:'
        )
        expect(updateResult.errors[0].message).toContain('status: SUBMITTED')
    })

    it('errors if the id doesnt match the db', async () => {
        // id is wrong
        // createdAt is wrong? or just overwrite
        //

        const server = await constructTestPostgresServer()
        const createdDraft = await createTestHealthPlanPackage(server)

        const formData = latestFormData(createdDraft)

        formData.id = uuidv4()

        const b64 = domainToBase64(formData)

        const updateResult = await server.executeOperation({
            query: UPDATE_HEALTH_PLAN_FORM_DATA,
            variables: {
                input: {
                    pkgID: createdDraft.id,
                    healthPlanFormData: b64,
                },
            },
        })

        expect(updateResult.errors).toBeDefined()
        if (updateResult.errors === undefined) {
            throw new Error('type narrow')
        }

        expect(updateResult.errors[0].extensions?.code).toBe('BAD_USER_INPUT')
        expect(updateResult.errors[0].message).toBe(
            'Transient server error: attempted to modify un-modifiable field(s): id.  Please refresh the page to continue.'
        )
    })

    it('errors if the other payload values dont match the db', async () => {
        const server = await constructTestPostgresServer()
        const createdDraft = await createTestHealthPlanPackage(server)

        const formData = latestFormData(createdDraft)

        formData.stateCode = 'CA'
        formData.stateNumber = 9999999
        formData.createdAt = new Date(2021)
        formData.updatedAt = new Date(2021)

        const b64 = domainToBase64(formData)

        const updateResult = await server.executeOperation({
            query: UPDATE_HEALTH_PLAN_FORM_DATA,
            variables: {
                input: {
                    pkgID: createdDraft.id,
                    healthPlanFormData: b64,
                },
            },
        })

        expect(updateResult.errors).toBeDefined()
        if (updateResult.errors === undefined) {
            throw new Error('type narrow')
        }

        expect(updateResult.errors[0].extensions?.code).toBe('BAD_USER_INPUT')
        expect(updateResult.errors[0].message).toBe(
            'Transient server error: attempted to modify un-modifiable field(s): stateCode,stateNumber,createdAt,updatedAt.  Please refresh the page to continue.'
        )
    })

    it('errors if the update call to the db fails', async () => {
        const prismaClient = await sharedTestPrismaClient()
        const postgresStore = NewPostgresStore(prismaClient)
        const failStore = mockStoreThatErrors()

        // set our store to error on the updateFormData call, only
        postgresStore.updateHealthPlanRevision =
            failStore.updateHealthPlanRevision

        const server = await constructTestPostgresServer({
            store: postgresStore,
        })

        const createdDraft = await createTestHealthPlanPackage(server)

        const formData = latestFormData(createdDraft)

        // update that draft.
        formData.submissionDescription = 'UPDATED BY REVISION'

        // convert to base64 proto
        const updatedB64 = domainToBase64(formData)

        const updateResult = await server.executeOperation({
            query: UPDATE_HEALTH_PLAN_FORM_DATA,
            variables: {
                input: {
                    pkgID: createdDraft.id,
                    healthPlanFormData: updatedB64,
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
        expect(updateResult.errors[0].message).toContain('UNEXPECTED_EXCEPTION')
        expect(updateResult.errors[0].message).toContain(
            'Error updating form data'
        )
    })

    it('converts RATES_RELATED documents to CONTRACT_RELATED on contract only submissions', async () => {
        const server = await constructTestPostgresServer()

        const updatedPackage = await createAndUpdateTestHealthPlanPackage(
            server,
            {
                submissionType: 'CONTRACT_ONLY',
                documents: [
                    {
                        name: 'contract_supporting_that_applies_to_a_rate_also.pdf',
                        s3URL: 'fakeS3URL',
                        documentCategories: [
                            'CONTRACT_RELATED' as const,
                            'RATES_RELATED' as const,
                        ],
                    },
                    {
                        name: 'rate_only_supporting_doc.pdf',
                        s3URL: 'fakeS3URL',
                        documentCategories: ['RATES_RELATED' as const],
                    },
                ],
            }
        )

        const currentRevision = updatedPackage.revisions[0].node

        const packageData = base64ToDomain(currentRevision.formDataProto)

        if (packageData instanceof Error) {
            throw new Error(packageData.message)
        }

        expect(packageData).toEqual(
            expect.objectContaining({
                documents: [
                    {
                        name: 'contract_supporting_that_applies_to_a_rate_also.pdf',
                        s3URL: 'fakeS3URL',
                        documentCategories: ['CONTRACT_RELATED'],
                    },
                    {
                        name: 'rate_only_supporting_doc.pdf',
                        s3URL: 'fakeS3URL',
                        documentCategories: ['CONTRACT_RELATED'],
                    },
                ],
            })
        )
    })
})
