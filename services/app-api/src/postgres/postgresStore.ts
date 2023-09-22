import type {
    PrismaClient,
    HealthPlanRevisionTable,
    Division,
} from '@prisma/client'
import type {
    UnlockedHealthPlanFormDataType,
    HealthPlanFormDataType,
    StateCodeType,
} from '../../../app-web/src/common-code/healthPlanFormDataType'
import type {
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
    RateType,
} from '../domain-models'
import { findPrograms, findStatePrograms } from '../postgres'
import type { StoreError } from './storeError'
import type { InsertHealthPlanPackageArgsType } from './healthPlanPackage'
import {
    findAllHealthPlanPackagesByState,
    findAllHealthPlanPackagesBySubmittedAt,
    findHealthPlanPackage,
    insertHealthPlanPackage,
    insertHealthPlanRevision,
    updateHealthPlanRevision,
    findAllRevisions,
} from './healthPlanPackage'
import type { InsertUserArgsType } from './user'
import {
    findUser,
    insertUser,
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
import type { ContractType } from '../domain-models/contractAndRates'
import {
    insertDraftContract,
    findContractWithHistory,
    updateDraftContractWithRates,
    findAllContractsWithHistoryByState,
    findAllContractsWithHistoryBySubmitInfo,
    submitContract,
    submitRate,
} from './contractAndRates'
import type {
    SubmitContractArgsType,
    SubmitRateArgsType,
    InsertContractArgsType,
    UpdateContractArgsType,
} from './contractAndRates'
import type { ContractOrErrorArrayType } from './contractAndRates/findAllContractsWithHistoryByState'

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

    /**
     * Rates database refactor prisma functions
     */
    insertDraftContract: (
        args: InsertContractArgsType
    ) => Promise<ContractType | Error>

    findContractWithHistory: (
        contractID: string
    ) => Promise<ContractType | Error>

    updateDraftContractWithRates: (
        args: UpdateContractArgsType
    ) => Promise<ContractType | Error>

    findAllContractsWithHistoryByState: (
        stateCode: string
    ) => Promise<ContractOrErrorArrayType | Error>

    findAllContractsWithHistoryBySubmitInfo: () => Promise<
        ContractOrErrorArrayType | Error
    >

    submitContract: (
        args: SubmitContractArgsType
    ) => Promise<ContractType | Error>

    submitRate: (args: SubmitRateArgsType) => Promise<RateType | Error>
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
        findContractWithHistory: (args) =>
            findContractWithHistory(client, args),
        updateDraftContractWithRates: (args) =>
            updateDraftContractWithRates(client, args),
        findAllContractsWithHistoryByState: (args) =>
            findAllContractsWithHistoryByState(client, args),
        findAllContractsWithHistoryBySubmitInfo: () =>
            findAllContractsWithHistoryBySubmitInfo(client),
        submitContract: (args) => submitContract(client, args),
        submitRate: (args) => submitRate(client, args),
    }
}

export type { Store }
export { NewPostgresStore }
