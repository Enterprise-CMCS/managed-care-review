import type {
    AdminUserType,
    CMSUsersUnionType,
    ContractType,
    StateUserType,
    UpdateInfoType,
} from '..'
import type { ReviewActionTypes } from './contractReviewActionType'

type SubmissionHistoryUserTypes =
    | UpdateInfoType['updatedBy']
    | CMSUsersUnionType
    | StateUserType
    | AdminUserType

// Contract history tracks submitted-visible changes to the contract package.
// Relationship-only rate link/unlink package events are skipped here because
// the current contract's submitted relationship changes are captured by its own
// CONTRACT_SUBMISSION.
type ContractSubmissionHistoryActionType =
    | 'CONTRACT_SUBMISSION'
    | 'LINKED_RATE_UPDATE'
    | 'UNLOCK'
    | 'UNDO_UNLOCK'
    | 'OVERRIDE'
    | ReviewActionTypes

// Rate history also tracks submitted-visible contract relationship changes.
// A contract can link or unlink a rate without creating a new rate revision, so
// RATE_LINK / RATE_UNLINK are meaningful rate history events when they appear
// in rate.packageSubmissions.
// Keep the review action side broad instead of narrowing to today's rate
// actions (`UNDER_REVIEW` / `WITHDRAW`) because rate review workflows may grow
// to approval or other contract-like review actions. Builders only emit
// actions actually present on rate.reviewStatusActions at runtime.
type RateSubmissionHistoryActionType =
    | 'RATE_SUBMISSION'
    | 'UNLOCK'
    | 'UNDO_UNLOCK'
    | 'OVERRIDE'
    | ReviewActionTypes
    | 'RATE_LINK'
    | 'RATE_UNLINK'

type QuestionResponseHistoryActionType =
    | 'CONTRACT_QUESTION'
    | 'CONTRACT_QUESTION_RESPONSE'
    | 'CONTRACT_QUESTION_DELETE'
    | 'CONTRACT_QUESTION_RESTORE'
    | 'CONTRACT_QUESTION_RESPONSE_DELETE'
    | 'CONTRACT_QUESTION_RESPONSE_RESTORE'
    | 'RATE_QUESTION'
    | 'RATE_QUESTION_RESPONSE'
    | 'RATE_QUESTION_DELETE'
    | 'RATE_QUESTION_RESTORE'
    | 'RATE_QUESTION_RESPONSE_DELETE'
    | 'RATE_QUESTION_RESPONSE_RESTORE'

type SubmissionHistoryActionType =
    | ContractSubmissionHistoryActionType
    | RateSubmissionHistoryActionType
    | QuestionResponseHistoryActionType

type BaseSubmissionHistoryEntry = {
    actionType: SubmissionHistoryActionType
    updatedAt: Date
    updatedBy?: SubmissionHistoryUserTypes
    updatedReason?: string
}

type ContractSubmissionHistoryEntry = BaseSubmissionHistoryEntry & {
    actionType: ContractSubmissionHistoryActionType
}

type RateSubmissionHistoryEntry = BaseSubmissionHistoryEntry & {
    actionType: RateSubmissionHistoryActionType
}

type QuestionResponseHistory = BaseSubmissionHistoryEntry & {
    actionType: QuestionResponseHistoryActionType
}

type CompleteHistory =
    | ContractSubmissionHistoryEntry
    | RateSubmissionHistoryEntry
    | QuestionResponseHistory

type SubmissionHistory = {
    contractID: string
    stateCode: ContractType['stateCode']
    history: CompleteHistory[]
}

export type {
    BaseSubmissionHistoryEntry,
    CompleteHistory,
    ContractSubmissionHistoryActionType,
    ContractSubmissionHistoryEntry,
    QuestionResponseHistoryActionType,
    QuestionResponseHistory,
    RateSubmissionHistoryActionType,
    RateSubmissionHistoryEntry,
    SubmissionHistoryActionType,
    SubmissionHistory,
    SubmissionHistoryUserTypes,
}
