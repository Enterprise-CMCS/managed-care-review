import { ApolloServer } from 'apollo-server-lambda'
import CREATE_HEALTH_PLAN_PACKAGE from 'app-graphql/src/mutations/createHealthPlanPackage.graphql'
import SUBMIT_HEALTH_PLAN_PACKAGE from 'app-graphql/src/mutations/submitHealthPlanPackage.graphql'
import UNLOCK_HEALTH_PLAN_PACKAGE from 'app-graphql/src/mutations/unlockHealthPlanPackage.graphql'
import FETCH_HEALTH_PLAN_PACKAGE from 'app-graphql/src/queries/fetchHealthPlanPackage.graphql'
import UPDATE_HEALTH_PLAN_FORM_DATA from 'app-graphql/src/mutations/updateHealthPlanFormData.graphql'
import CREATE_CONTRACT_QUESTION from 'app-graphql/src/mutations/createContractQuestion.graphql'
import CREATE_CONTRACT_QUESTION_RESPONSE from 'app-graphql/src/mutations/createContractQuestionResponse.graphql'
import UPDATE_STATE_ASSIGNMENTS_BY_STATE from 'app-graphql/src/mutations/updateStateAssignmentsByState.graphql'
import CREATE_RATE_QUESTION from 'app-graphql/src/mutations/createRateQuestion.graphql'
import typeDefs from 'app-graphql/src/schema.graphql'
import type {
    HealthPlanFormDataType,
    UnlockedHealthPlanFormDataType,
    StateCodeType,
} from '../common-code/healthPlanFormDataType'
import type {
    CreateContractQuestionInput,
    InsertQuestionResponseArgs,
    ProgramType,
    CreateRateQuestionInputType,
} from '../domain-models'
import type { Emailer } from '../emailer'
import { newLocalEmailer } from '../emailer'
import type {
    CreateHealthPlanPackageInput,
    HealthPlanPackage,
    CreateContractQuestionResponsePayload,
    CreateContractQuestionPayload,
    UpdateStateAssignmentsByStatePayload,
} from '../gen/gqlServer'
import type { Context } from '../handlers/apollo_gql'
import type { Store } from '../postgres'
import { NewPostgresStore } from '../postgres'
import { configureResolvers } from '../resolvers'
import { latestFormData } from './healthPlanPackageHelpers'
import { sharedTestPrismaClient } from './storeHelpers'
import { domainToBase64 } from '../common-code/proto/healthPlanFormDataProto'
import type { EmailParameterStore } from '../parameterStore'
import { newLocalEmailParameterStore } from '../parameterStore'
import { testLDService } from './launchDarklyHelpers'
import type { LDService } from '../launchDarkly/launchDarkly'
import { insertUserToLocalAurora } from '../authn'
import { testStateUser } from './userHelpers'
import { findStatePrograms } from '../postgres'
import { must } from './assertionHelpers'
import { newJWTLib } from '../jwt'
import type { JWTLib } from '../jwt'
import { testS3Client } from './s3Helpers'
import type { S3ClientT } from '../s3'
import { convertRateInfoToRateFormDataInput } from '../domain-models/contractAndRates/convertHPPtoContractWithRates'
import { createAndUpdateTestContractWithoutRates } from './gqlContractHelpers'
import { addNewRateToTestContract } from './gqlRateHelpers'
import type { GraphQLResponse } from 'apollo-server-types'

// Since our programs are checked into source code, we have a program we
// use as our default
function defaultFloridaProgram(): ProgramType {
    const program = must(findStatePrograms('FL'))[0]
    return program
}

function defaultFloridaRateProgram(): ProgramType {
    const programs = must(findStatePrograms('FL'))
    const rateProgram = programs.find((program) => program.isRateProgram)

    if (!rateProgram) {
        throw new Error(
            'Unexpected error: Rate program not found in Florida programs'
        )
    }

    return rateProgram
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
    jwt?: JWTLib
    s3Client?: S3ClientT
}): Promise<ApolloServer> => {
    // set defaults
    const context = opts?.context || defaultContext()
    const emailer = opts?.emailer || constructTestEmailer()
    const parameterStore =
        opts?.emailParameterStore || newLocalEmailParameterStore()
    const ldService = opts?.ldService || testLDService()

    const prismaClient = await sharedTestPrismaClient()
    const postgresStore = opts?.store || NewPostgresStore(prismaClient)
    const jwt =
        opts?.jwt ||
        newJWTLib({
            issuer: 'mcreviewtest',
            signingKey: Buffer.from('123af', 'hex'),
            expirationDurationS: 1000,
        })

    await insertUserToLocalAurora(postgresStore, context.user)
    const s3TestClient = testS3Client()
    const s3 = opts?.s3Client || s3TestClient

    const postgresResolvers = configureResolvers(
        postgresStore,
        emailer,
        parameterStore,
        ldService,
        jwt,
        s3
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
        oactEmails: ['testRate@example.com'],
        dmcpReviewEmails: ['testPolicy@example.com'],
        dmcpSubmissionEmails: ['testPolicySubmission@example.com'],
        dmcoEmails: ['testDmco@example.com'],
        helpDeskEmail: 'MC_Review_HelpDesk@example.com>',
    }
    return newLocalEmailer(config)
}

const createTestHealthPlanPackage = async (
    server: ApolloServer,
    stateCode?: StateCodeType
): Promise<HealthPlanPackage> => {
    const programs = stateCode
        ? [must(findStatePrograms(stateCode))[0]]
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

const updateTestHealthPlanPackage = async (
    server: ApolloServer,
    pkgID: string,
    partialUpdates?: Partial<UnlockedHealthPlanFormDataType>
): Promise<HealthPlanPackage> => {
    const pkg = await fetchTestHealthPlanPackageById(server, pkgID)
    const draft = latestFormData(pkg)

    Object.assign(draft, partialUpdates)

    const updateResult = await server.executeOperation({
        query: UPDATE_HEALTH_PLAN_FORM_DATA,
        variables: {
            input: {
                pkgID: pkgID,
                healthPlanFormData: domainToBase64(draft),
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
    // the rates have to be added separately now
    let rateFormDatas = []
    if (partialUpdates?.rateInfos) {
        rateFormDatas = convertRateInfoToRateFormDataInput(
            partialUpdates?.rateInfos || []
        )
    } else {
        const ratePrograms = stateCode
            ? [must(findStatePrograms(stateCode))[0]]
            : [defaultFloridaRateProgram()]
        // let's have some default test data:
        rateFormDatas = [
            {
                rateType: 'NEW' as const,
                rateDateStart: '2025-05-01',
                rateDateEnd: '2026-04-30',
                rateDateCertified: '2025-03-15',
                rateDocuments: [
                    {
                        name: 'rateDocument.pdf',
                        s3URL: 's3://bucketname/key/test',
                        sha256: 'fakesha',
                    },
                ],
                supportingDocuments: [],
                //We only want one rate ID and use last program in list to differentiate from programID if possible.
                rateProgramIDs: [ratePrograms.reverse()[0].id],
                certifyingActuaryContacts: [
                    {
                        name: 'test name',
                        titleRole: 'test title',
                        email: 'email@example.com',
                        actuarialFirm: 'MERCER' as const,
                        actuarialFirmOther: '',
                    },
                ],
                actuaryCommunicationPreference: 'OACT_TO_ACTUARY' as const,
            },
        ]
    }

    let contract = await createAndUpdateTestContractWithoutRates(
        server,
        stateCode,
        partialUpdates
    )
    for (const rateData of rateFormDatas) {
        contract = await addNewRateToTestContract(server, contract, rateData)
    }
    const updatedDraft = await fetchTestHealthPlanPackageById(
        server,
        contract.id
    )
    return updatedDraft
}

const createAndSubmitTestHealthPlanPackage = async (
    server: ApolloServer,
    partialUpdates?: Partial<UnlockedHealthPlanFormDataType>
): Promise<HealthPlanPackage> => {
    const pkg = await createAndUpdateTestHealthPlanPackage(
        server,
        partialUpdates
    )

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
    contractID: string,
    questionData?: Omit<CreateContractQuestionInput, 'contractID'>
): Promise<CreateContractQuestionPayload> => {
    const question = questionData || {
        documents: [
            {
                name: 'Test Question',
                s3URL: 's3://bucketname/key/test1',
            },
        ],
    }
    const createdQuestion = await server.executeOperation({
        query: CREATE_CONTRACT_QUESTION,
        variables: {
            input: {
                contractID,
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

    return createdQuestion.data.createContractQuestion
}

const createTestRateQuestion = async (
    server: ApolloServer,
    rateID: string,
    questionData?: Omit<CreateRateQuestionInputType, 'rateID'>
): Promise<GraphQLResponse> => {
    const question = questionData || {
        documents: [
            {
                name: 'Test Question',
                s3URL: 's3://bucketname/key/test1',
            },
        ],
    }
    return await server.executeOperation({
        query: CREATE_RATE_QUESTION,
        variables: {
            input: {
                rateID,
                ...question,
            },
        },
    })
}

const createTestQuestionResponse = async (
    server: ApolloServer,
    questionID: string,
    responseData?: Omit<InsertQuestionResponseArgs, 'questionID'>
): Promise<CreateContractQuestionResponsePayload> => {
    const response = responseData || {
        documents: [
            {
                name: 'Test Question Response',
                s3URL: 's3://bucketname/key/test1',
            },
        ],
    }
    const createdResponse = await server.executeOperation({
        query: CREATE_CONTRACT_QUESTION_RESPONSE,
        variables: {
            input: {
                ...response,
                questionID,
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

    return createdResponse.data.createContractQuestionResponse
}

const updateTestStateAssignments = async (
    server: ApolloServer,
    stateCode: string,
    assignedUserIDs: string[]
): Promise<UpdateStateAssignmentsByStatePayload> => {
    const updatedAssignments = await server.executeOperation({
        query: UPDATE_STATE_ASSIGNMENTS_BY_STATE,
        variables: {
            input: {
                stateCode,
                assignedUsers: assignedUserIDs,
            },
        },
    })

    if (updatedAssignments.errors)
        throw new Error(
            `updateStateAssignmentsByState mutation failed with errors ${updatedAssignments.errors}`
        )

    if (!updatedAssignments.data) {
        throw new Error('updateStateAssignmentsByState returned nothing')
    }

    return updatedAssignments.data.updateStateAssignmentsByState
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
    createTestQuestionResponse,
    updateTestHealthPlanPackage,
    updateTestStateAssignments,
    createTestRateQuestion,
}
