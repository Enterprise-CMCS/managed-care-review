import { PrismaClient } from '@prisma/client'
import {
    DraftSubmissionType,
    ProgramT,
    StateSubmissionType,
} from '../../app-web/src/common-code/domain-models'
import { findProgram } from '../postgres'
import { findAllSubmissions } from './findAllSubmissions'
import { findDraftSubmission } from './findDraftSubmission'
import { findStateSubmission } from './findStateSubmission'
import {
    insertDraftSubmission,
    InsertDraftSubmissionArgsType,
} from './insertDraftSubmission'
import { StoreError } from './storeError'
import { updateDraftSubmission } from './updateDraftSubmission'
import { updateStateSubmission } from './updateStateSubmission'

type Store = {
    insertDraftSubmission: (
        args: InsertDraftSubmissionArgsType
    ) => Promise<DraftSubmissionType | StoreError>

    findAllSubmissions: (
        stateCode: string
    ) => Promise<(DraftSubmissionType | StateSubmissionType)[] | StoreError>

    findDraftSubmission: (
        draftUUID: string
    ) => Promise<DraftSubmissionType | undefined | StoreError>
    findDraftSubmissionByStateNumber: (
        stateCoder: string,
        stateNumber: number
    ) => Promise<DraftSubmissionType | undefined | StoreError>

    updateDraftSubmission: (
        draftSubmission: DraftSubmissionType
    ) => Promise<DraftSubmissionType | StoreError>

    findStateSubmission: (
        draftUUID: string
    ) => Promise<StateSubmissionType | undefined | StoreError>

    updateStateSubmission: (
        stateSubmission: StateSubmissionType
    ) => Promise<StateSubmissionType | StoreError>

    findProgram: (stateCode: string, programIDs: Array<string>) => ProgramT | undefined
}

function NewPostgresStore(client: PrismaClient): Store {
    return {
        findAllSubmissions: (stateCode) =>
            findAllSubmissions(client, stateCode),
        insertDraftSubmission: (args) => insertDraftSubmission(client, args),
        findDraftSubmission: (draftUUID) =>
            findDraftSubmission(client, draftUUID),
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        findDraftSubmissionByStateNumber: (_stateCode, _stateNumber) => {
            throw new Error('UNIMPLEMENTED')
        },
        updateDraftSubmission: (draftSubmission) =>
            updateDraftSubmission(client, draftSubmission),
        updateStateSubmission: (submission) =>
            updateStateSubmission(client, submission),
        findStateSubmission: (submissionID) =>
            findStateSubmission(client, submissionID),
        findProgram: findProgram,
    }
}

export { NewPostgresStore, Store }
