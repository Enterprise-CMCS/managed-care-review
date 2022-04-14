import { ApolloServer } from 'apollo-server-lambda'
import CREATE_SUBMISSION_2 from '../../app-graphql/src/mutations/createHealthPlanPackage.graphql'
import SUBMIT_DRAFT_SUBMISSION from '../../app-graphql/src/mutations/submitHealthPlanPackage.graphql'
import UNLOCK_STATE_SUBMISSION from '../../app-graphql/src/mutations/unlockHealthPlanPackage.graphql'
import FETCH_HEALTH_PLAN_PACKAGE from '../../app-graphql/src/queries/fetchHealthPlanPackage.graphql'
import UPDATE_HEALTH_PLAN_FORM_DATA from '../../app-graphql/src/mutations/updateHealthPlanFormData.graphql'
import typeDefs from '../../app-graphql/src/schema.graphql'
import {
    HealthPlanFormDataType,
    ProgramT,
    UnlockedHealthPlanFormDataType,
} from '../../app-web/src/common-code/domain-models'
import { Emailer, newLocalEmailer } from '../emailer'
import {
    CreateHealthPlanPackageInput,
    HealthPlanPackage,
} from '../gen/gqlServer'
import { Context } from '../handlers/apollo_gql'
import { NewPostgresStore, Store } from '../postgres'
import { configureResolvers } from '../resolvers'
import { latestFormData } from './healthPlanPackageHelpers'
import { sharedTestPrismaClient } from './storeHelpers'
import { domainToBase64 } from '../../app-web/src/common-code/proto/stateSubmission'

// Since our programs are checked into source code, we have a program we
// use as our default
function defaultFloridaProgram(): ProgramT {
    return {
        id: '5c10fe9f-bec9-416f-a20c-718b152ad633',
        name: 'MMA',
    }
}

const defaultContext = (): Context => {
    return {
        user: {
            name: 'james brown',
            state_code: 'FL',
            role: 'STATE_USER',
            email: 'james@example.com',
        },
    }
}

const constructTestPostgresServer = async (opts?: {
    context?: Context
    emailer?: Emailer
    store?: Store
}): Promise<ApolloServer> => {
    // set defaults
    const context = opts?.context || defaultContext()
    const emailer = opts?.emailer || constructTestEmailer()

    const prismaClient = await sharedTestPrismaClient()
    const postgresStore = opts?.store || NewPostgresStore(prismaClient)
    const postgresResolvers = configureResolvers(postgresStore, emailer)

    return new ApolloServer({
        typeDefs,
        resolvers: postgresResolvers,
        context,
    })
}

const constructTestEmailer = (): Emailer => {
    const config = {
        emailSource: 'local@example.com',
        stage: 'localtest',
        baseUrl: 'http://localtest',
        cmsReviewSharedEmails: ['test@example.com'],
    }
    return newLocalEmailer(config)
}

const createTestHealthPlanPackage = async (
    server: ApolloServer
): Promise<HealthPlanPackage> => {
    const input: CreateHealthPlanPackageInput = {
        programIDs: [defaultFloridaProgram().id],
        submissionType: 'CONTRACT_ONLY' as const,
        submissionDescription: 'A created submission',
    }
    const result = await server.executeOperation({
        query: CREATE_SUBMISSION_2,
        variables: { input },
    })
    if (result.errors) {
        throw new Error(
            `createTestDraftSubmission mutation failed with errors ${result.errors}`
        )
    }

    if (!result.data) {
        throw new Error('CreateHealthPlanPackage returned nothing')
    }

    return result.data.createHealthPlanPackage.pkg
}

const updateTestHealthPlanFormData = async (
    server: ApolloServer,
    updatedFormData: HealthPlanFormDataType
): Promise<HealthPlanPackage> => {
    const updatedB64 = domainToBase64(updatedFormData)

    const updateResult = await server.executeOperation({
        query: UPDATE_HEALTH_PLAN_FORM_DATA,
        variables: {
            input: {
                pkgID: updatedFormData.id,
                healthPlanFormData: updatedB64,
            },
        },
    })

    if (updateResult.errors) {
        console.log('errors', updateResult.errors)
        throw new Error(
            `updateTestHealthPlanFormData mutation failed with errors ${updateResult.errors}`
        )
    }

    if (!updateResult.data) {
        throw new Error('updateTestHealthPlanFormData returned nothing')
    }

    return updateResult.data.updateHealthPlanFormData.pkg
}

const createAndUpdateTestDraftSubmission = async (
    server: ApolloServer,
    partialDraftSubmissionUpdates?: Partial<UnlockedHealthPlanFormDataType>
): Promise<HealthPlanPackage> => {
    const pkg = await createTestHealthPlanPackage(server)
    const draft = latestFormData(pkg)

    ;(draft.submissionType = 'CONTRACT_AND_RATES' as const),
        (draft.submissionDescription = 'An updated submission')
    draft.stateContacts = [
        {
            name: 'test name',
            titleRole: 'test title',
            email: 'email@test.com',
        },
    ]
    draft.actuaryContacts = [
        {
            name: 'test name',
            titleRole: 'test title',
            email: 'email@test.com',
            actuarialFirm: 'MERCER' as const,
            actuarialFirmOther: '',
        },
    ]
    ;(draft.actuaryCommunicationPreference = 'OACT_TO_ACTUARY' as const),
        (draft.contractType = 'BASE' as const)
    draft.contractExecutionStatus = 'EXECUTED' as const
    draft.contractDateStart = new Date(Date.UTC(2025, 5, 1))
    draft.contractDateEnd = new Date(Date.UTC(2026, 4, 30))
    draft.contractDocuments = [
        {
            name: 'contractDocument.pdf',
            s3URL: 'fakeS3URL',
            documentCategories: ['CONTRACT' as const],
        },
    ]
    draft.managedCareEntities = ['MCO']
    draft.federalAuthorities = ['STATE_PLAN' as const]
    draft.rateType = 'NEW' as const
    draft.rateDateStart = new Date(Date.UTC(2025, 5, 1))
    draft.rateDateEnd = new Date(Date.UTC(2026, 4, 30))
    draft.rateDateCertified = new Date(Date.UTC(2025, 3, 15))
    draft.rateDocuments = [
        {
            name: 'rateDocument.pdf',
            s3URL: 'fakeS3URL',
            documentCategories: ['RATES' as const],
        },
    ]

    Object.assign(draft, partialDraftSubmissionUpdates)

    const updatedDraft = await updateTestHealthPlanFormData(server, draft)

    return updatedDraft
}

const createAndSubmitTestHealthPlanPackage = async (server: ApolloServer) => {
    const pkg = await createAndUpdateTestDraftSubmission(server)
    return await submitTestDraftSubmission(server, pkg.id)
}

const submitTestDraftSubmission = async (
    server: ApolloServer,
    submissionID: string
) => {
    const updateResult = await server.executeOperation({
        query: SUBMIT_DRAFT_SUBMISSION,
        variables: {
            input: {
                pkgID: submissionID,
            },
        },
    })

    if (updateResult.errors) {
        console.log('errors', updateResult.errors)
        throw new Error(
            `submitTestDraftSubmission mutation failed with errors ${updateResult.errors}`
        )
    }

    if (updateResult.data === undefined || updateResult.data === null) {
        throw new Error('submitTestDraftSubmission returned nothing')
    }

    return updateResult.data.submitHealthPlanPackage.pkg
}

const resubmitTestDraftSubmission = async (
    server: ApolloServer,
    submissionID: string,
    submittedReason: string
) => {
    const updateResult = await server.executeOperation({
        query: SUBMIT_DRAFT_SUBMISSION,
        variables: {
            input: {
                pkgID: submissionID,
                submittedReason,
            },
        },
    })

    if (updateResult.errors) {
        console.log('errors', updateResult.errors)
        throw new Error(
            `resubmitTestDraftSubmission mutation failed with errors ${updateResult.errors}`
        )
    }

    if (updateResult.data === undefined || updateResult.data === null) {
        throw new Error('resubmitTestDraftSubmission returned nothing')
    }

    return updateResult.data.submitHealthPlanPackage.pkg
}

const unlockTestDraftSubmission = async (
    server: ApolloServer,
    submissionID: string,
    unlockedReason: string
): Promise<HealthPlanPackage> => {
    const updateResult = await server.executeOperation({
        query: UNLOCK_STATE_SUBMISSION,
        variables: {
            input: {
                pkgID: submissionID,
                unlockedReason,
            },
        },
    })

    if (updateResult.errors) {
        console.log('errors', updateResult.errors)
        throw new Error(
            `unlockTestDraftSubmission mutation failed with errors ${updateResult.errors}`
        )
    }

    if (updateResult.data === undefined || updateResult.data === null) {
        throw new Error('unlockTestDraftSubmission returned nothing')
    }

    return updateResult.data.unlockHealthPlanPackage.pkg
}

const fetchTestHealthPlanPackageById = async (
    server: ApolloServer,
    pkgID: string
): Promise<HealthPlanPackage> => {
    const input = { pkgID }
    const result = await server.executeOperation({
        query: FETCH_HEALTH_PLAN_PACKAGE,
        variables: { input },
    })

    if (result.errors)
        throw new Error(
            `fetchTestHealthPlanPackageById query failed with errors ${result.errors}`
        )

    if (!result.data) {
        throw new Error('fetchTestHealthPlanPackageById returned nothing')
    }

    return result.data.fetchHealthPlanPackage.pkg
}

export {
    constructTestPostgresServer,
    createTestHealthPlanPackage,
    createAndUpdateTestDraftSubmission,
    createAndSubmitTestHealthPlanPackage,
    updateTestHealthPlanFormData,
    fetchTestHealthPlanPackageById,
    submitTestDraftSubmission,
    unlockTestDraftSubmission,
    resubmitTestDraftSubmission,
    defaultContext,
    defaultFloridaProgram,
}
