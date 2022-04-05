import {
    constructTestPostgresServer,
    createTestSubmission2,
} from '../testHelpers/gqlHelpers'
import UPDATE_HEALTH_PLAN_FORM_DATA from '../../app-graphql/src/mutations/updateHealthPlanFormData.graphql'
import { domainToBase64 } from '../../app-web/src/common-code/proto/stateSubmission'
import { latestFormData } from '../testHelpers/healthPlanPackageHelpers'
import { basicStateSubmission } from '../../app-web/src/common-code/domain-mocks'
import { v4 as uuidv4 } from 'uuid'

describe('updateHealthPlanFormData', () => {
    it('updates valid fields in the formData', async () => {
        const server = await constructTestPostgresServer()

        const createdDraft = await createTestSubmission2(server)

        const formData = latestFormData(createdDraft)

        // update that draft.
        formData.submissionDescription = 'UPDATED BY REVISION'

        // convert to base64 proto
        const updatedB64 = domainToBase64(formData)

        const updateResult = await server.executeOperation({
            query: UPDATE_HEALTH_PLAN_FORM_DATA,
            variables: {
                input: {
                    submissionID: createdDraft.id,
                    healthPlanFormData: updatedB64,
                },
            },
        })

        expect(updateResult.errors).toBeUndefined()

        const healthPlanPackage =
            updateResult.data?.updateHealthPlanFormData.submission

        const updatedFormData = latestFormData(healthPlanPackage)
        expect(updatedFormData.submissionDescription).toBe(
            'UPDATED BY REVISION'
        )
    })

    it('errors if a CMS user calls it', async () => {
        const server = await constructTestPostgresServer()

        const createdDraft = await createTestSubmission2(server)

        const formData = latestFormData(createdDraft)

        // update that draft.
        formData.submissionDescription = 'UPDATED BY REVISION'

        // convert to base64 proto
        const updatedB64 = domainToBase64(formData)

        const cmsUserServer = await constructTestPostgresServer({
            context: {
                user: {
                    name: 'Zuko',
                    role: 'CMS_USER',
                    email: 'aang@va.gov',
                },
            },
        })

        const updateResult = await cmsUserServer.executeOperation({
            query: UPDATE_HEALTH_PLAN_FORM_DATA,
            variables: {
                input: {
                    submissionID: createdDraft.id,
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
        const createdDraft = await createTestSubmission2(server)
        const formData = latestFormData(createdDraft)

        // update that draft.
        formData.submissionDescription = 'UPDATED BY REVISION'

        // convert to base64 proto
        const updatedB64 = domainToBase64(formData)

        // setup a server with a different user
        const otherUserServer = await constructTestPostgresServer({
            context: {
                user: {
                    name: 'Aang',
                    state_code: 'VA',
                    role: 'STATE_USER',
                    email: 'aang@va.gov',
                },
            },
        })

        const updateResult = await otherUserServer.executeOperation({
            query: UPDATE_HEALTH_PLAN_FORM_DATA,
            variables: {
                input: {
                    submissionID: createdDraft.id,
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

        const createdDraft = await createTestSubmission2(server)

        const formData = 'not-valid-proto'

        const updateResult = await server.executeOperation({
            query: UPDATE_HEALTH_PLAN_FORM_DATA,
            variables: {
                input: {
                    submissionID: createdDraft.id,
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

        const createdDraft = await createTestSubmission2(server)

        const stateSubmission = basicStateSubmission()

        const formData = domainToBase64(stateSubmission)

        const updateResult = await server.executeOperation({
            query: UPDATE_HEALTH_PLAN_FORM_DATA,
            variables: {
                input: {
                    submissionID: createdDraft.id,
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

    it('errors if the payload is already submitted', async () => {
        const server = await constructTestPostgresServer()
        const createdDraft = await createTestSubmission2(server)
        const stateSubmission = basicStateSubmission()
        const formData = domainToBase64(stateSubmission)

        const updateResult = await server.executeOperation({
            query: UPDATE_HEALTH_PLAN_FORM_DATA,
            variables: {
                input: {
                    submissionID: createdDraft.id,
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

    it('errors if the id doesnt match the db', async () => {
        // id is wrong
        // createdAt is wrong? or just overwrite
        //

        const server = await constructTestPostgresServer()
        const createdDraft = await createTestSubmission2(server)

        const formData = latestFormData(createdDraft)

        formData.id = uuidv4()

        const b64 = domainToBase64(formData)

        const updateResult = await server.executeOperation({
            query: UPDATE_HEALTH_PLAN_FORM_DATA,
            variables: {
                input: {
                    submissionID: createdDraft.id,
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
            'Attempted to modify un-modifiable field(s): id'
        )
    })

    it('errors if the other payload values dont match the db', async () => {
        const server = await constructTestPostgresServer()
        const createdDraft = await createTestSubmission2(server)

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
                    submissionID: createdDraft.id,
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
            'Attempted to modify un-modifiable field(s): stateCode,stateNumber,createdAt,updatedAt'
        )
    })
})
