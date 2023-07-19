import { ApolloServer } from 'apollo-server-lambda'
import CREATE_HEALTH_PLAN_PACKAGE from 'app-graphql/src/mutations/createHealthPlanPackage.graphql'
import SUBMIT_HEALTH_PLAN_PACKAGE from 'app-graphql/src/mutations/submitHealthPlanPackage.graphql'
import UNLOCK_HEALTH_PLAN_PACKAGE from 'app-graphql/src/mutations/unlockHealthPlanPackage.graphql'
import FETCH_HEALTH_PLAN_PACKAGE from 'app-graphql/src/queries/fetchHealthPlanPackage.graphql'
import UPDATE_HEALTH_PLAN_FORM_DATA from 'app-graphql/src/mutations/updateHealthPlanFormData.graphql'
import CREATE_QUESTION from 'app-graphql/src/mutations/createQuestion.graphql'
import INDEX_QUESTIONS from 'app-graphql/src/queries/indexQuestions.graphql'
import CREATE_QUESTION_RESPONSE from 'app-graphql/src/mutations/createQuestionResponse.graphql'
import typeDefs from 'app-graphql/src/schema.graphql'
import {
    HealthPlanFormDataType,
    UnlockedHealthPlanFormDataType,
    StateCodeType,
} from 'app-web/src/common-code/healthPlanFormDataType'
import {
    CreateQuestionInput,
    InsertQuestionResponseArgs,
    ProgramType,
} from '../domain-models'
import { Emailer, newLocalEmailer } from '../emailer'
import {
    CreateHealthPlanPackageInput,
    HealthPlanPackage,
    CreateQuestionResponsePayload,
    CreateQuestionPayload,
    IndexQuestionsPayload,
} from '../gen/gqlServer'
import { Context } from '../handlers/apollo_gql'
import { NewPostgresStore, Store } from '../postgres'
import { configureResolvers } from '../resolvers'
import { latestFormData } from './healthPlanPackageHelpers'
import { sharedTestPrismaClient } from './storeHelpers'
import { domainToBase64 } from 'app-web/src/common-code/proto/healthPlanFormDataProto'
import {
    newLocalEmailParameterStore,
    EmailParameterStore,
} from '../parameterStore'
import statePrograms from 'app-web/src/common-code/data/statePrograms.json'
import { testLDService } from './launchDarklyHelpers'
import { LDService } from '../launchDarkly/launchDarkly'
import { insertUserToLocalAurora } from '../authn'
import { testStateUser } from './userHelpers'

// Since our programs are checked into source code, we have a program we
// use as our default
function defaultFloridaProgram(): ProgramType {
    return {
        id: '5c10fe9f-bec9-416f-a20c-718b152ad633',
        name: 'MMA',
        fullName: 'Managed Medical Assistance Program ',
    }
}

function defaultFloridaRateProgram(): ProgramType {
    return {
        id: '3b8d8fa1-1fa6-4504-9c5b-ef522877fe1e',
        fullName: 'Long-term Care Program',
        name: 'LTC',
    }
}

function getProgramsFromState(stateCode: StateCodeType): ProgramType[] {
    const state = statePrograms.states.find((st) => st.code === stateCode)

    return state?.programs || []
}

const defaultContext = (): Context => {
    return {
        user: testStateUser(),
    }
}

const constructTestPostgresServer = async (opts?: {
    context?: Context
    emailer?: Emailer
    store?: Store
    emailParameterStore?: EmailParameterStore
    ldService?: LDService
}): Promise<ApolloServer> => {
    // set defaults
    const context = opts?.context || defaultContext()
    const emailer = opts?.emailer || constructTestEmailer()
    const parameterStore =
        opts?.emailParameterStore || newLocalEmailParameterStore()
    const ldService = opts?.ldService || testLDService()

    const prismaClient = await sharedTestPrismaClient()
    const postgresStore = opts?.store || NewPostgresStore(prismaClient)

    await insertUserToLocalAurora(postgresStore, context.user)

    const postgresResolvers = configureResolvers(
        postgresStore,
        emailer,
        parameterStore,
        ldService
    )

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
        devReviewTeamEmails: ['test@example.com'],
        cmsReviewHelpEmailAddress: 'mcog@example.com',
        cmsRateHelpEmailAddress: 'rates@example.com',
        cmsDevTeamHelpEmailAddress: 'mc-review@example.com',
        oactEmails: ['testRate@example.com'],
        dmcpEmails: ['testPolicy@example.com'],
        dmcoEmails: ['testDmco@example.com'],
    }
    return newLocalEmailer(config)
}

const createTestHealthPlanPackage = async (
    server: ApolloServer,
    stateCode?: StateCodeType
): Promise<HealthPlanPackage> => {
    const programs = stateCode
        ? getProgramsFromState(stateCode)
        : [defaultFloridaProgram()]

    const programIDs = programs.map((program) => program.id)
    const input: CreateHealthPlanPackageInput = {
        programIDs: programIDs,
        populationCovered: 'MEDICAID',
        riskBasedContract: false,
        submissionType: 'CONTRACT_ONLY',
        submissionDescription: 'A created submission',
        contractType: 'BASE',
    }
    const result = await server.executeOperation({
        query: CREATE_HEALTH_PLAN_PACKAGE,
        variables: { input },
    })
    if (result.errors) {
        throw new Error(
            `createTestHealthPlanPackage mutation failed with errors ${result.errors}`
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
        console.info('errors', JSON.stringify(updateResult.errors))
        throw new Error(
            `updateTestHealthPlanFormData mutation failed with errors ${updateResult.errors}`
        )
    }

    if (!updateResult.data) {
        throw new Error('updateTestHealthPlanFormData returned nothing')
    }
    return updateResult.data.updateHealthPlanFormData.pkg
}

const createAndUpdateTestHealthPlanPackage = async (
    server: ApolloServer,
    partialUpdates?: Partial<UnlockedHealthPlanFormDataType>,
    stateCode?: StateCodeType
): Promise<HealthPlanPackage> => {
    const pkg = await createTestHealthPlanPackage(server, stateCode)
    const draft = latestFormData(pkg)

    const ratePrograms = stateCode
        ? getProgramsFromState(stateCode)
        : [defaultFloridaRateProgram()]

    ;(draft.submissionType = 'CONTRACT_AND_RATES' as const),
        (draft.submissionDescription = 'An updated submission')
    draft.stateContacts = [
        {
            name: 'test name',
            titleRole: 'test title',
            email: 'email@example.com',
        },
    ]
    draft.rateInfos = [
        {
            rateType: 'NEW' as const,
            rateDateStart: new Date(Date.UTC(2025, 5, 1)),
            rateDateEnd: new Date(Date.UTC(2026, 4, 30)),
            rateDateCertified: new Date(Date.UTC(2025, 3, 15)),
            rateDocuments: [
                {
                    name: 'rateDocument.pdf',
                    s3URL: 'fakeS3URL',
                    documentCategories: ['RATES' as const],
                },
            ],
            supportingDocuments: [],
            //We only want one rate ID and use last program in list to differentiate from programID if possible.
            rateProgramIDs: [ratePrograms.reverse()[0].id],
            actuaryContacts: [
                {
                    name: 'test name',
                    titleRole: 'test title',
                    email: 'email@example.com',
                    actuarialFirm: 'MERCER' as const,
                    actuarialFirmOther: '',
                },
            ],
            actuaryCommunicationPreference: 'OACT_TO_ACTUARY' as const,
            packagesWithSharedRateCerts: [],
        },
    ]
    draft.addtlActuaryContacts = [
        {
            name: 'test name',
            titleRole: 'test title',
            email: 'email@example.com',
            actuarialFirm: 'MERCER' as const,
            actuarialFirmOther: '',
        },
    ]
    ;(draft.addtlActuaryCommunicationPreference = 'OACT_TO_ACTUARY' as const),
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
    draft.populationCovered = 'MEDICAID' as const
    draft.contractAmendmentInfo = {
        modifiedProvisions: {
            inLieuServicesAndSettings: true,
            modifiedRiskSharingStrategy: false,
            modifiedIncentiveArrangements: false,
            modifiedWitholdAgreements: false,
            modifiedStateDirectedPayments: true,
            modifiedPassThroughPayments: true,
            modifiedPaymentsForMentalDiseaseInstitutions: true,
            modifiedNonRiskPaymentArrangements: true,
        },
    }

    Object.assign(draft, partialUpdates)

    const updatedDraft = await updateTestHealthPlanFormData(server, draft)

    return updatedDraft
}

const createAndSubmitTestHealthPlanPackage = async (server: ApolloServer) => {
    const pkg = await createAndUpdateTestHealthPlanPackage(server)
    return await submitTestHealthPlanPackage(server, pkg.id)
}

const submitTestHealthPlanPackage = async (
    server: ApolloServer,
    pkgID: string
) => {
    const updateResult = await server.executeOperation({
        query: SUBMIT_HEALTH_PLAN_PACKAGE,
        variables: {
            input: {
                pkgID,
            },
        },
    })

    if (updateResult.errors) {
        console.info('errors', updateResult.errors)
        throw new Error(
            `submitTestHealthPlanPackage mutation failed with errors ${updateResult.errors}`
        )
    }

    if (updateResult.data === undefined || updateResult.data === null) {
        throw new Error('submitTestHealthPlanPackage returned nothing')
    }

    return updateResult.data.submitHealthPlanPackage.pkg
}

const resubmitTestHealthPlanPackage = async (
    server: ApolloServer,
    pkgID: string,
    submittedReason: string
) => {
    const updateResult = await server.executeOperation({
        query: SUBMIT_HEALTH_PLAN_PACKAGE,
        variables: {
            input: {
                pkgID,
                submittedReason,
            },
        },
    })

    if (updateResult.errors) {
        console.info('errors', updateResult.errors)
        throw new Error(
            `resubmitTestHealthPlanPackage mutation failed with errors ${updateResult.errors}`
        )
    }

    if (updateResult.data === undefined || updateResult.data === null) {
        throw new Error('resubmitTestHealthPlanPackage returned nothing')
    }

    return updateResult.data.submitHealthPlanPackage.pkg
}

const unlockTestHealthPlanPackage = async (
    server: ApolloServer,
    pkgID: string,
    unlockedReason: string
): Promise<HealthPlanPackage> => {
    const updateResult = await server.executeOperation({
        query: UNLOCK_HEALTH_PLAN_PACKAGE,
        variables: {
            input: {
                pkgID: pkgID,
                unlockedReason,
            },
        },
    })

    if (updateResult.errors) {
        console.info('errors', updateResult.errors)
        throw new Error(
            `unlockTestHealthPlanPackage mutation failed with errors ${updateResult.errors}`
        )
    }

    if (updateResult.data === undefined || updateResult.data === null) {
        throw new Error('unlockTestHealthPlanPackage returned nothing')
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

const createTestQuestion = async (
    server: ApolloServer,
    pkgID: string,
    questionData?: Omit<CreateQuestionInput, 'pkgID'>
): Promise<CreateQuestionPayload> => {
    const question = questionData || {
        documents: [
            {
                name: 'Test Question',
                s3URL: 'testS3Url',
            },
        ],
    }
    const createdQuestion = await server.executeOperation({
        query: CREATE_QUESTION,
        variables: {
            input: {
                pkgID,
                ...question,
            },
        },
    })

    if (createdQuestion.errors)
        throw new Error(
            `createTestQuestion mutation failed with errors ${createdQuestion.errors}`
        )

    if (!createdQuestion.data) {
        throw new Error('createTestQuestion returned nothing')
    }

    return createdQuestion.data.createQuestion
}

const indexTestQuestions = async (
    server: ApolloServer,
    pkgID: string
): Promise<IndexQuestionsPayload> => {
    const indexQuestionsResult = await server.executeOperation({
        query: INDEX_QUESTIONS,
        variables: {
            input: {
                pkgID: pkgID,
            },
        },
    })

    if (indexQuestionsResult.errors)
        throw new Error(
            `indexTestQuestions query failed with errors ${indexQuestionsResult.errors}`
        )

    if (!indexQuestionsResult.data) {
        throw new Error('indexTestQuestions returned nothing')
    }

    return indexQuestionsResult.data.indexQuestions
}

const createTestQuestionResponse = async (
    server: ApolloServer,
    questionID: string,
    responseData?: Omit<InsertQuestionResponseArgs, 'questionID'>
): Promise<CreateQuestionResponsePayload> => {
    const response = responseData || {
        documents: [
            {
                name: 'Test Question',
                s3URL: 'testS3Url',
            },
        ],
    }
    const createdResponse = await server.executeOperation({
        query: CREATE_QUESTION_RESPONSE,
        variables: {
            input: {
                questionID,
                ...response,
            },
        },
    })

    if (createdResponse.errors)
        throw new Error(
            `createTestQuestionResponse mutation failed with errors ${createdResponse.errors}`
        )

    if (!createdResponse.data) {
        throw new Error('createTestQuestionResponse returned nothing')
    }

    return createdResponse.data.createQuestionResponse
}
export {
    constructTestPostgresServer,
    createTestHealthPlanPackage,
    createAndUpdateTestHealthPlanPackage,
    createAndSubmitTestHealthPlanPackage,
    updateTestHealthPlanFormData,
    fetchTestHealthPlanPackageById,
    submitTestHealthPlanPackage,
    unlockTestHealthPlanPackage,
    resubmitTestHealthPlanPackage,
    defaultContext,
    defaultFloridaProgram,
    defaultFloridaRateProgram,
    createTestQuestion,
    indexTestQuestions,
    createTestQuestionResponse,
}
