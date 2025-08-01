import { ApolloServer } from 'apollo-server-lambda'
import {
    CreateHealthPlanPackageDocument,
    SubmitHealthPlanPackageDocument,
    UnlockHealthPlanPackageDocument,
    FetchHealthPlanPackageDocument,
    UpdateStateAssignmentsByStateDocument,
    CreateRateQuestionResponseDocument,
    UpdateHealthPlanFormDataDocument,
    CreateRateQuestionDocument,
    CreateContractQuestionResponseDocument,
    CreateContractQuestionDocument,
} from '../gen/gqlClient'
import typeDefs from 'app-graphql/src/schema.graphql'
import type {
    HealthPlanFormDataType,
    UnlockedHealthPlanFormDataType,
    StateCodeType,
} from '@mc-review/hpp'
import type {
    CreateContractQuestionInput,
    InsertQuestionResponseArgs,
    ProgramType,
    CreateRateQuestionInputType,
    EmailSettingsType,
} from '../domain-models'
import type { EmailConfiguration, Emailer } from '../emailer'
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
import { domainToBase64 } from '@mc-review/hpp'
import {
    newLocalEmailParameterStore,
    type EmailParameterStore,
} from '../parameterStore'
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
import { configureEmailer } from '../handlers/configuration'
import type { DocumentZipService } from '../zip/generateZip'
import {
    documentZipService,
    localGenerateDocumentZip,
} from '../zip/generateZip'

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
    store?: Partial<Store>
    emailParameterStore?: EmailParameterStore // to be deleted when we remove parameter store, just rely on postgres
    ldService?: LDService
    jwt?: JWTLib
    s3Client?: S3ClientT
    documentZip?: DocumentZipService
}): Promise<ApolloServer> => {
    // set defaults
    const context = opts?.context || defaultContext()
    const ldService = opts?.ldService || testLDService()
    const prismaClient = await sharedTestPrismaClient()
    const postgresStore = {
        ...NewPostgresStore(prismaClient),
        ...opts?.store,
    }
    const jwt =
        opts?.jwt ||
        newJWTLib({
            issuer: 'mcreviewtest',
            signingKey: Buffer.from('123af', 'hex'),
            expirationDurationS: 1000,
        })

    const localDocumentZip =
        opts?.documentZip ??
        documentZipService(postgresStore, localGenerateDocumentZip)

    await insertUserToLocalAurora(postgresStore, context.user)
    const s3TestClient = testS3Client()
    const s3 = opts?.s3Client || s3TestClient

    const testEmailConfigForParameterStore = {
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

    const emailer =
        opts?.emailer ??
        (await constructTestEmailer({
            emailConfig: testEmailConfigForParameterStore, // to be deleted when we remove parameter store, just rely on postgres
            postgresStore,
            ldService,
        }))

    if (emailer instanceof Error) {
        throw new Error(`Failed to configure emailer: ${emailer.message}`)
    }

    const postgresResolvers = configureResolvers(
        postgresStore,
        emailer,
        ldService,
        jwt,
        s3,
        'https://localhost:3000',
        localDocumentZip
    )

    return new ApolloServer({
        typeDefs,
        resolvers: postgresResolvers,
        context,
    })
}

const constructTestEmailer = async (opts: {
    emailConfig: EmailConfiguration // to be deleted when we remove parameter store, only option will be to read from postgres
    postgresStore: Store
    ldService?: LDService
}): Promise<Emailer> => {
    const {
        emailConfig,
        postgresStore,
        ldService = testLDService({ 'remove-parameter-store': true }), // default to using email settings from database
    } = opts ?? {}
    let store = postgresStore
    if (!store) {
        const prismaClient = await sharedTestPrismaClient()
        store = NewPostgresStore(prismaClient)
    }
    const removeParameterStore = await ldService.getFeatureFlag({
        key: 'foo',
        flag: 'remove-parameter-store',
    })

    const emailSettings = await store.findEmailSettings()
    if (emailSettings instanceof Error) {
        throw emailSettings // throw error if email settings not in place in tests
    }

    // go into test emailer with both paramet
    const testEmailSettings: EmailSettingsType = {
        emailSource: removeParameterStore
            ? emailSettings.emailSource
            : emailConfig.emailSource,
        devReviewTeamEmails: removeParameterStore
            ? emailSettings.devReviewTeamEmails
            : emailConfig.devReviewTeamEmails,
        oactEmails: removeParameterStore
            ? emailSettings.oactEmails
            : emailConfig.oactEmails,
        dmcpReviewEmails: removeParameterStore
            ? emailSettings.dmcpReviewEmails
            : emailConfig.dmcpReviewEmails,
        dmcpSubmissionEmails: removeParameterStore
            ? emailSettings.dmcpSubmissionEmails
            : emailConfig.dmcpSubmissionEmails,
        dmcoEmails: removeParameterStore
            ? emailSettings.dmcoEmails
            : emailConfig.dmcoEmails,
        // These three settings are string[] in db but string in EmailConfiguration, follow up ticket will convert EmailConfiguration to string[]
        cmsReviewHelpEmailAddress: removeParameterStore
            ? emailSettings.cmsReviewHelpEmailAddress
            : [emailConfig.cmsReviewHelpEmailAddress],
        cmsRateHelpEmailAddress: removeParameterStore
            ? emailSettings.cmsRateHelpEmailAddress
            : [emailConfig.cmsRateHelpEmailAddress],
        helpDeskEmail: removeParameterStore
            ? emailSettings.helpDeskEmail
            : [emailConfig.helpDeskEmail],
    }

    store.findEmailSettings = async () => {
        return testEmailSettings
    }

    return must(
        await configureEmailer({
            emailParameterStore: newLocalEmailParameterStore(),
            store,
            ldService,
            stageName: emailConfig?.stage ?? 'localtest',
            emailerMode: 'LOCAL',
            applicationEndpoint: emailConfig?.baseUrl ?? 'http://localtest',
        })
    )
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
        query: CreateHealthPlanPackageDocument,
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
        query: UpdateHealthPlanFormDataDocument,
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
        query: UpdateHealthPlanFormDataDocument,
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
                amendmentEffectiveDateStart: undefined,
                amendmentEffectiveDateEnd: undefined,
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
        query: SubmitHealthPlanPackageDocument,
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
        query: SubmitHealthPlanPackageDocument,
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
        query: UnlockHealthPlanPackageDocument,
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
        query: FetchHealthPlanPackageDocument,
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
        query: CreateContractQuestionDocument,
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
        query: CreateRateQuestionDocument,
        variables: {
            input: {
                rateID,
                ...question,
            },
        },
    })
}

const createTestRateQuestionResponse = async (
    server: ApolloServer,
    questionID: string,
    responseData?: Omit<InsertQuestionResponseArgs, 'questionID'>
): Promise<GraphQLResponse> => {
    const response = responseData || {
        documents: [
            {
                name: 'Test Question Response',
                s3URL: 's3://bucketname/key/test1',
            },
        ],
    }

    return await server.executeOperation({
        query: CreateRateQuestionResponseDocument,
        variables: {
            input: {
                ...response,
                questionID,
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
        query: CreateContractQuestionResponseDocument,
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
        query: UpdateStateAssignmentsByStateDocument,
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
    createTestRateQuestionResponse,
    constructTestEmailer,
}
