import { PrismaClient, HealthPlanRevisionTable, Division } from '@prisma/client'
import {
    UnlockedHealthPlanFormDataType,
    HealthPlanFormDataType,
    StateCodeType,
} from '../../../app-web/src/common-code/healthPlanFormDataType'
import {
    ProgramType,
    HealthPlanPackageType,
    UpdateInfoType,
    UserType,
    CMSUserType,
    StateUserType,
    Question,
    CreateQuestionInput,
    QuestionResponseType,
    InsertQuestionResponseArgs,
    StateType,
} from '../domain-models'
import { findPrograms, findStatePrograms } from '../postgres'
import { StoreError } from './storeError'
import {
    findAllHealthPlanPackagesByState,
    findAllHealthPlanPackagesBySubmittedAt,
    findHealthPlanPackage,
    insertHealthPlanPackage,
    InsertHealthPlanPackageArgsType,
    insertHealthPlanRevision,
    updateHealthPlanRevision,
    findAllRevisions,
} from './healthPlanPackage'
import {
    findUser,
    insertUser,
    InsertUserArgsType,
    updateCmsUserProperties,
    findAllUsers,
    insertManyUsers,
} from './user'
import {
    findAllQuestionsByHealthPlanPackage,
    insertQuestion,
    insertQuestionResponse,
} from './questionResponse'
import { findAllSupportedStates } from './state'
import { ContractType } from '../domain-models/contractAndRates/contractAndRatesZodSchema'
import {
    InsertContractArgsType,
    insertDraftContract,
} from './contractAndRates/insertContract'

type Store = {
    findPrograms: (
        stateCode: string,
        programIDs: Array<string>
    ) => ProgramType[] | Error

    findStatePrograms: (stateCode: string) => ProgramType[] | Error

    findAllSupportedStates: () => Promise<StateType[] | StoreError>

    findAllRevisions: () => Promise<HealthPlanRevisionTable[] | StoreError>

    findAllUsers: () => Promise<UserType[] | StoreError>

    findHealthPlanPackage: (
        draftUUID: string
    ) => Promise<HealthPlanPackageType | undefined | StoreError>

    findAllHealthPlanPackagesByState: (
        stateCode: string
    ) => Promise<HealthPlanPackageType[] | StoreError>

    findAllHealthPlanPackagesBySubmittedAt: () => Promise<
        HealthPlanPackageType[] | StoreError
    >

    insertHealthPlanPackage: (
        args: InsertHealthPlanPackageArgsType
    ) => Promise<HealthPlanPackageType | StoreError>

    updateHealthPlanRevision: (
        pkgID: string,
        revisionID: string,
        formData: HealthPlanFormDataType,
        submitInfo?: UpdateInfoType
    ) => Promise<HealthPlanPackageType | StoreError>

    insertHealthPlanRevision: (
        pkgID: string,
        unlockInfo: UpdateInfoType,
        draft: UnlockedHealthPlanFormDataType
    ) => Promise<HealthPlanPackageType | StoreError>

    findUser: (id: string) => Promise<UserType | undefined | StoreError>

    insertUser: (user: InsertUserArgsType) => Promise<UserType | StoreError>

    insertManyUsers: (
        users: InsertUserArgsType[]
    ) => Promise<UserType[] | StoreError>

    updateCmsUserProperties: (
        userID: string,
        states: StateCodeType[],
        idOfUserPerformingUpdate: string,
        divisionAssignment?: Division,
        description?: string | null
    ) => Promise<CMSUserType | StoreError>

    insertQuestion: (
        questionInput: CreateQuestionInput,
        user: CMSUserType
    ) => Promise<Question | StoreError>

    findAllQuestionsByHealthPlanPackage: (
        pkgID: string
    ) => Promise<Question[] | StoreError>

    insertQuestionResponse: (
        questionInput: InsertQuestionResponseArgs,
        user: StateUserType
    ) => Promise<QuestionResponseType | StoreError>

    insertDraftContract: (
        args: InsertContractArgsType
    ) => Promise<ContractType | Error>
}

function NewPostgresStore(client: PrismaClient): Store {
    return {
        insertHealthPlanPackage: (args) =>
            insertHealthPlanPackage(client, args),
        findHealthPlanPackage: (id) => findHealthPlanPackage(client, id),
        findAllHealthPlanPackagesByState: (stateCode) =>
            findAllHealthPlanPackagesByState(client, stateCode),
        findAllHealthPlanPackagesBySubmittedAt: () =>
            findAllHealthPlanPackagesBySubmittedAt(client),
        updateHealthPlanRevision: (pkgID, revisionID, formData, submitInfo) =>
            updateHealthPlanRevision(
                client,
                pkgID,
                revisionID,
                formData,
                submitInfo
            ),
        insertHealthPlanRevision: (pkgID, unlockInfo, draft) =>
            insertHealthPlanRevision(client, {
                pkgID,
                unlockInfo,
                draft,
            }),
        findPrograms: findPrograms,
        findUser: (id) => findUser(client, id),
        insertUser: (args) => insertUser(client, args),
        insertManyUsers: (args) => insertManyUsers(client, args),
        updateCmsUserProperties: (
            userID,
            stateCodes,
            idOfUserPerformingUpdate,
            divisionAssignment,
            description
        ) =>
            updateCmsUserProperties(
                client,
                userID,
                stateCodes,
                idOfUserPerformingUpdate,
                divisionAssignment,
                description
            ),
        findStatePrograms: findStatePrograms,
        findAllSupportedStates: () => findAllSupportedStates(client),
        findAllRevisions: () => findAllRevisions(client),
        findAllUsers: () => findAllUsers(client),
        insertQuestion: (questionInput, user) =>
            insertQuestion(client, questionInput, user),
        findAllQuestionsByHealthPlanPackage: (pkgID) =>
            findAllQuestionsByHealthPlanPackage(client, pkgID),
        insertQuestionResponse: (questionInput, user) =>
            insertQuestionResponse(client, questionInput, user),
        /**
         * Rates database refactor prisma functions
         */
        insertDraftContract: (args) => insertDraftContract(client, args),
    }
}

export { NewPostgresStore, Store }
