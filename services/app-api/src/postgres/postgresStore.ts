import type {
    Division,
    RateRevisionTable,
    ContractRevisionTable,
    DocumentZipPackage,
    DocumentZipType,
} from '@prisma/client'
import type { StateCodeType } from '@mc-review/submissions'
import type {
    ProgramType,
    UserType,
    StateUserType,
    ContractQuestionType,
    CreateContractQuestionInput,
    InsertQuestionResponseArgs,
    StateType,
    RateType,
    ContractType,
    UnlockedContractType,
    CMSUsersUnionType,
    RateQuestionType,
    CreateRateQuestionInputType,
    AuditDocument,
    EmailSettingsType,
} from '../domain-models'
import { findPrograms, findStatePrograms } from './'
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
    insertContractQuestion,
    insertContractQuestionResponse,
    insertRateQuestion,
    findAllQuestionsByRate,
    insertRateQuestionResponse,
} from './questionResponse'
import { findAllSupportedStates } from './state'
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
    unlockContract,
    updateDraftContract,
    findContractRevision,
    findRateRevision,
    approveContract,
} from './contractAndRates'
import type {
    SubmitContractArgsType,
    SubmitRateArgsType,
    InsertContractArgsType,
    UpdateContractArgsType,
    ContractOrErrorArrayType,
    RateOrErrorArrayType,
    UpdateMCCRSIDFormArgsType,
    FindAllRatesWithHistoryBySubmitType,
    ApproveContractArgsType,
} from './contractAndRates'
import type { UnlockContractArgsType } from './contractAndRates/unlockContract'
import { unlockRate } from './contractAndRates/unlockRate'
import type { UnlockRateArgsType } from './contractAndRates/unlockRate'
import { findRateWithHistory } from './contractAndRates/findRateWithHistory'
import { updateDraftContractRates } from './contractAndRates/updateDraftContractRates'
import type { UpdateDraftContractRatesArgsType } from './contractAndRates/updateDraftContractRates'
import { updateStateAssignedUsers } from './state/updateStateAssignedUsers'
import { findStateAssignedUsers } from './state/findStateAssignedUsers'

import {
    type CreateDocumentZipPackageArgsType,
    findAllDocuments,
    findDocumentById,
} from './documents'
import type { WithdrawRateArgsType } from './contractAndRates/withdrawRate'
import { withdrawRate } from './contractAndRates/withdrawRate'
import { findEmailSettings } from './settings/findEmailSettings'
import { updateEmailSettings } from './settings/updateEmailSettings'
import type { ExtendedPrismaClient } from './prismaClient'
import {
    undoWithdrawRate,
    type UndoWithdrawRateArgsType,
} from './contractAndRates/undoWithdrawRate'
import {
    overrideRateData,
    type OverrideRateDataArgsType,
} from './contractAndRates/overrideRateData'
import type {
    FindAllRatesStrippedType,
    StrippedRateOrErrorArrayType,
} from './contractAndRates/findAllRatesStripped'
import { findAllRatesStripped } from './contractAndRates/findAllRatesStripped'
import type {
    WithdrawContractArgsType,
    WithdrawContractReturnType,
} from './contractAndRates/withdrawContract'
import { withdrawContract } from './contractAndRates/withdrawContract'
import { findRateRelatedContracts } from './contractAndRates/findRateRelatedContracts'
import type { RelatedContractStripped, SharedDocument } from '../gen/gqlClient'
import {
    undoWithdrawContract,
    type UndoWithdrawContractArgsType,
    type UndoWithdrawContractReturnType,
} from './contractAndRates/undoWithdrawContract'
import {
    createOAuthClient as _createOAuthClient,
    listOAuthClients as _listOAuthClients,
    getOAuthClientById as _getOAuthClientById,
    getOAuthClientByClientId as _getOAuthClientByClientId,
    deleteOAuthClient as _deleteOAuthClient,
    updateOAuthClient as _updateOAuthClient,
    getOAuthClientsByUserId as _getOAuthClientsByUserId,
} from './oauth/oauthClientStore'

import {
    createDocumentZipPackage,
    findDocumentZipPackagesByContractRevision,
    findDocumentZipPackagesByRateRevision,
} from './documents'
import type { DocumentTypes } from '../domain-models/DocumentType'

type Store = {
    /** Settings functions **/
    findEmailSettings: () => Promise<EmailSettingsType | Error>
    updateEmailSettings: (
        emailSettings: EmailSettingsType
    ) => Promise<EmailSettingsType | Error>
    findPrograms: (
        stateCode: string,
        programIDs: Array<string>
    ) => ProgramType[] | Error
    findStatePrograms: (stateCode: string) => ProgramType[] | Error
    findAllSupportedStates: () => Promise<StateType[] | Error>

    /** User functions **/
    insertUser: (user: InsertUserArgsType) => Promise<UserType | Error>
    insertManyUsers: (
        users: InsertUserArgsType[]
    ) => Promise<UserType[] | Error>
    findAllUsers: () => Promise<UserType[] | Error>
    findUser: (id: string) => Promise<UserType | undefined | Error>
    findStateAssignedUsers: (
        stateCode: StateCodeType
    ) => Promise<UserType[] | Error>
    updateStateAssignedUsers: (
        idOfUserPerformingUpdate: string,
        stateCode: StateCodeType,
        assignedUserIDs: string[]
    ) => Promise<UserType[] | Error>
    updateCmsUserProperties: (
        userID: string,
        idOfUserPerformingUpdate: string,
        states?: StateCodeType[],
        divisionAssignment?: Division,
        description?: string | null
    ) => Promise<CMSUsersUnionType | Error>

    /** Contract functions **/
    insertDraftContract: (
        args: InsertContractArgsType
    ) => Promise<ContractType | Error>
    findContractWithHistory: (
        contractID: string
    ) => Promise<ContractType | Error>
    findAllContractsWithHistoryByState: (
        stateCode: string
    ) => Promise<ContractOrErrorArrayType | Error>
    findAllContractsWithHistoryBySubmitInfo: (
        useZod?: boolean,
        skipFindingLatest?: boolean
    ) => Promise<ContractOrErrorArrayType | Error>
    findContractRevision: (
        contractRevID: string
    ) => Promise<ContractRevisionTable | Error>
    updateContract: (
        args: UpdateMCCRSIDFormArgsType
    ) => Promise<ContractType | Error>
    updateDraftContract: (
        args: UpdateContractArgsType
    ) => Promise<ContractType | Error>
    updateDraftContractWithRates: (
        args: UpdateContractArgsType
    ) => Promise<ContractType | Error>
    updateDraftContractRates: (
        args: UpdateDraftContractRatesArgsType
    ) => Promise<ContractType | Error>
    submitContract: (
        args: SubmitContractArgsType
    ) => Promise<ContractType | Error>
    unlockContract: (
        args: UnlockContractArgsType,
        linkRatesFF?: boolean
    ) => Promise<UnlockedContractType | Error>
    approveContract: (
        args: ApproveContractArgsType
    ) => Promise<ContractType | Error>
    withdrawContract: (
        args: WithdrawContractArgsType
    ) => Promise<WithdrawContractReturnType | Error>
    undoWithdrawContract: (
        args: UndoWithdrawContractArgsType
    ) => Promise<UndoWithdrawContractReturnType | Error>

    /** Rate functions **/
    findRateWithHistory: (rateID: string) => Promise<RateType | Error>
    findRateRevision: (
        rateRevisionID: string
    ) => Promise<RateRevisionTable | Error>
    findRateRelatedContracts: (
        rateID: string
    ) => Promise<RelatedContractStripped[] | Error>
    findAllRatesWithHistoryBySubmitInfo: (
        args?: FindAllRatesWithHistoryBySubmitType
    ) => Promise<RateOrErrorArrayType | Error>
    findAllRatesStripped: (
        args?: FindAllRatesStrippedType
    ) => Promise<StrippedRateOrErrorArrayType | Error>
    submitRate: (args: SubmitRateArgsType) => Promise<RateType | Error>
    unlockRate: (args: UnlockRateArgsType) => Promise<RateType | Error>
    withdrawRate: (args: WithdrawRateArgsType) => Promise<RateType | Error>
    undoWithdrawRate: (
        args: UndoWithdrawRateArgsType
    ) => Promise<RateType | Error>
    overrideRateData: (
        args: OverrideRateDataArgsType
    ) => Promise<RateType | Error>

    /** Q&A functions **/
    insertContractQuestion: (
        questionInput: CreateContractQuestionInput,
        user: CMSUsersUnionType
    ) => Promise<ContractQuestionType | Error>
    insertContractQuestionResponse: (
        questionInput: InsertQuestionResponseArgs,
        user: StateUserType
    ) => Promise<ContractQuestionType | Error>
    findAllQuestionsByContract: (
        pkgID: string
    ) => Promise<ContractQuestionType[] | Error>
    insertRateQuestion: (
        questionInput: CreateRateQuestionInputType,
        user: CMSUsersUnionType
    ) => Promise<RateQuestionType | Error>
    insertRateQuestionResponse: (
        questionInput: InsertQuestionResponseArgs,
        user: StateUserType
    ) => Promise<RateQuestionType | Error>
    findAllQuestionsByRate: (
        rateID: string
    ) => Promise<RateQuestionType[] | Error>

    /** Documents **/
    findAllDocuments: () => Promise<AuditDocument[] | Error>
    findDocumentById: (
        docID: string,
        docType?: DocumentTypes
    ) => Promise<SharedDocument | Error>
    createDocumentZipPackage: (
        args: CreateDocumentZipPackageArgsType
    ) => Promise<DocumentZipPackage | Error>
    findDocumentZipPackagesByContractRevision: (
        contractRevisionID: string,
        documentType?: DocumentZipType
    ) => Promise<DocumentZipPackage[] | Error>
    findDocumentZipPackagesByRateRevision: (
        rateRevisionID: string,
        documentType?: DocumentZipType
    ) => Promise<DocumentZipPackage[] | Error>

    /** OAuth **/
    createOAuthClient: (
        data: Parameters<typeof _createOAuthClient>[1]
    ) => ReturnType<typeof _createOAuthClient>
    listOAuthClients: () => ReturnType<typeof _listOAuthClients>
    getOAuthClientById: (id: string) => ReturnType<typeof _getOAuthClientById>
    getOAuthClientByClientId: (
        clientId: string
    ) => ReturnType<typeof _getOAuthClientByClientId>
    deleteOAuthClient: (
        clientId: string
    ) => ReturnType<typeof _deleteOAuthClient>
    updateOAuthClient: (
        clientId: string,
        data: Parameters<typeof _updateOAuthClient>[2]
    ) => ReturnType<typeof _updateOAuthClient>
    getOAuthClientsByUserId: (
        userID: string
    ) => ReturnType<typeof _getOAuthClientsByUserId>
}

function NewPostgresStore(client: ExtendedPrismaClient): Store {
    return {
        /** Settings functions **/
        findEmailSettings: () => findEmailSettings(client),
        updateEmailSettings: (emailSettings) =>
            updateEmailSettings(client, emailSettings),
        findPrograms: findPrograms,
        findStatePrograms: findStatePrograms,
        findAllSupportedStates: () => findAllSupportedStates(client),

        /** User functions **/
        insertUser: (args) => insertUser(client, args),
        insertManyUsers: (args) => insertManyUsers(client, args),
        findAllUsers: () => findAllUsers(client),
        findUser: (id) => findUser(client, id),
        findStateAssignedUsers: (stateCode) =>
            findStateAssignedUsers(client, stateCode),
        updateStateAssignedUsers: (
            idOfUserPerformingUpdate,
            stateCode,
            assignedUserIDs
        ) =>
            updateStateAssignedUsers(
                client,
                idOfUserPerformingUpdate,
                stateCode,
                assignedUserIDs
            ),
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

        /** Contract functions **/
        insertDraftContract: (args) => insertDraftContract(client, args),
        findContractWithHistory: (args) =>
            findContractWithHistory(client, args),
        findAllContractsWithHistoryByState: (args) =>
            findAllContractsWithHistoryByState(client, args),
        findAllContractsWithHistoryBySubmitInfo: (args) =>
            findAllContractsWithHistoryBySubmitInfo(client, args),
        findContractRevision: (args) => findContractRevision(client, args),
        updateContract: (args) => updateMCCRSID(client, args),
        updateDraftContract: (args) => updateDraftContract(client, args),
        updateDraftContractWithRates: (args) =>
            updateDraftContractWithRates(client, args),
        updateDraftContractRates: (args) =>
            updateDraftContractRates(client, args),
        submitContract: (args) => submitContract(client, args),
        unlockContract: (args) => unlockContract(client, args),
        approveContract: (args) => approveContract(client, args),
        withdrawContract: (args) => withdrawContract(client, args),
        undoWithdrawContract: (args) => undoWithdrawContract(client, args),

        /** Rate functions **/
        findRateWithHistory: (args) => findRateWithHistory(client, args),
        findRateRevision: (args) => findRateRevision(client, args),
        findRateRelatedContracts: (args) =>
            findRateRelatedContracts(client, args),
        findAllRatesWithHistoryBySubmitInfo: (args) =>
            findAllRatesWithHistoryBySubmitInfo(client, args),
        findAllRatesStripped: (args) => findAllRatesStripped(client, args),
        submitRate: (args) => submitRate(client, args),
        unlockRate: (args) => unlockRate(client, args),
        withdrawRate: (args) => withdrawRate(client, args),
        undoWithdrawRate: (args) => undoWithdrawRate(client, args),
        overrideRateData: (args) => overrideRateData(client, args),

        /** Q&A functions **/
        insertContractQuestion: (questionInput, user) =>
            insertContractQuestion(client, questionInput, user),
        insertContractQuestionResponse: (questionInput, user) =>
            insertContractQuestionResponse(client, questionInput, user),
        findAllQuestionsByContract: (pkgID) =>
            findAllQuestionsByContract(client, pkgID),
        insertRateQuestion: (questionInput, user) =>
            insertRateQuestion(client, questionInput, user),
        insertRateQuestionResponse: (questionInput, user) =>
            insertRateQuestionResponse(client, questionInput, user),
        findAllQuestionsByRate: (rateID) =>
            findAllQuestionsByRate(client, rateID),

        /** Documents **/
        findAllDocuments: () => findAllDocuments(client),
        findDocumentById: (docID, docType) =>
            findDocumentById(client, docID, docType),
        createDocumentZipPackage: (args) =>
            createDocumentZipPackage(client, args),
        findDocumentZipPackagesByContractRevision: (
            contractRevisionID,
            documentType
        ) =>
            findDocumentZipPackagesByContractRevision(
                client,
                contractRevisionID,
                documentType
            ),
        findDocumentZipPackagesByRateRevision: (rateRevisionID, documentType) =>
            findDocumentZipPackagesByRateRevision(
                client,
                rateRevisionID,
                documentType
            ),

        /** Oauth **/
        createOAuthClient: (data) => _createOAuthClient(client, data),
        listOAuthClients: () => _listOAuthClients(client),
        getOAuthClientById: (id) => _getOAuthClientById(client, id),
        getOAuthClientByClientId: (clientId) =>
            _getOAuthClientByClientId(client, clientId),
        deleteOAuthClient: (clientId) => _deleteOAuthClient(client, clientId),
        updateOAuthClient: (clientId, data) =>
            _updateOAuthClient(client, clientId, data),
        getOAuthClientsByUserId: (userID) =>
            _getOAuthClientsByUserId(client, userID),
    }
}

export type { Store }
export { NewPostgresStore }
