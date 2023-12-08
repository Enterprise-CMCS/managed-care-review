import type { PrismaClient, Division } from '@prisma/client'
import type { StateCodeType } from '../../../app-web/src/common-code/healthPlanFormDataType'
import type {
    ProgramType,
    UserType,
    CMSUserType,
    StateUserType,
    Question,
    CreateQuestionInput,
    InsertQuestionResponseArgs,
    StateType,
    RateType,
} from '../domain-models'
import { findPrograms, findStatePrograms } from '../postgres'
import type { StoreError } from './storeError'
import type { InsertUserArgsType } from './user'
import {
    findUser,
    insertUser,
    updateCmsUserProperties,
    findAllUsers,
    insertManyUsers,
} from './user'
import {
    findAllQuestionsByContract,
    insertQuestion,
    insertQuestionResponse,
} from './questionResponse'
import { findAllSupportedStates } from './state'
import type { ContractType } from '../domain-models/contractAndRates'
import {
    insertDraftContract,
    findContractWithHistory,
    updateDraftContractWithRates,
    updateMCCRSID,
    findAllContractsWithHistoryByState,
    findAllContractsWithHistoryBySubmitInfo,
    findAllRatesWithHistoryBySubmitInfo,
    submitContract,
    submitRate,
} from './contractAndRates'
import type {
    SubmitContractArgsType,
    SubmitRateArgsType,
    InsertContractArgsType,
    UpdateContractArgsType,
    ContractOrErrorArrayType,
    RateOrErrorArrayType,
    UpdateMCCRSIDFormArgsType,
} from './contractAndRates'
import { unlockContract } from './contractAndRates/unlockContract'
import type { UnlockContractArgsType } from './contractAndRates/unlockContract'
import { unlockRate } from './contractAndRates/unlockRate'
import type { UnlockRateArgsType } from './contractAndRates/unlockRate'
import { findRateWithHistory } from './contractAndRates/findRateWithHistory'

type Store = {
    findPrograms: (
        stateCode: string,
        programIDs: Array<string>
    ) => ProgramType[] | Error

    findStatePrograms: (stateCode: string) => ProgramType[] | Error

    findAllSupportedStates: () => Promise<StateType[] | StoreError>

    findAllUsers: () => Promise<UserType[] | StoreError>

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

    findAllQuestionsByContract: (pkgID: string) => Promise<Question[] | Error>

    insertQuestionResponse: (
        questionInput: InsertQuestionResponseArgs,
        user: StateUserType
    ) => Promise<Question | StoreError>

    insertDraftContract: (
        args: InsertContractArgsType
    ) => Promise<ContractType | Error>

    findContractWithHistory: (
        contractID: string
    ) => Promise<ContractType | Error>

    findRateWithHistory: (rateID: string) => Promise<RateType | Error>
    updateContract: (
        args: UpdateMCCRSIDFormArgsType
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
    findAllRatesWithHistoryBySubmitInfo: () => Promise<
        RateOrErrorArrayType | Error
    >

    submitContract: (
        args: SubmitContractArgsType
    ) => Promise<ContractType | Error>

    submitRate: (args: SubmitRateArgsType) => Promise<RateType | Error>

    unlockContract: (
        args: UnlockContractArgsType
    ) => Promise<ContractType | Error>

    unlockRate: (args: UnlockRateArgsType) => Promise<RateType | Error>
}

function NewPostgresStore(client: PrismaClient): Store {
    return {
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
        findAllUsers: () => findAllUsers(client),

        insertQuestion: (questionInput, user) =>
            insertQuestion(client, questionInput, user),
        findAllQuestionsByContract: (pkgID) =>
            findAllQuestionsByContract(client, pkgID),
        insertQuestionResponse: (questionInput, user) =>
            insertQuestionResponse(client, questionInput, user),

        insertDraftContract: (args) => insertDraftContract(client, args),
        findContractWithHistory: (args) =>
            findContractWithHistory(client, args),
        findRateWithHistory: (args) => findRateWithHistory(client, args),
        updateDraftContractWithRates: (args) =>
            updateDraftContractWithRates(client, args),
        updateContract: (args) => updateMCCRSID(client, args),
        findAllContractsWithHistoryByState: (args) =>
            findAllContractsWithHistoryByState(client, args),
        findAllContractsWithHistoryBySubmitInfo: () =>
            findAllContractsWithHistoryBySubmitInfo(client),
        findAllRatesWithHistoryBySubmitInfo: () =>
            findAllRatesWithHistoryBySubmitInfo(client),
        submitContract: (args) => submitContract(client, args),
        submitRate: (args) => submitRate(client, args),
        unlockContract: (args) => unlockContract(client, args),
        unlockRate: (args) => unlockRate(client, args),
    }
}

export type { Store }
export { NewPostgresStore }
