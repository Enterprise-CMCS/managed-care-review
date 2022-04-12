import { PrismaClient } from '@prisma/client'
import {
    UnlockedHealthPlanFormDataType,
    ProgramT,
    LockedHealthPlanFormDataType,
    HealthPlanPackageType,
    UpdateInfoType,
} from '../../app-web/src/common-code/domain-models'
import { findPrograms } from '../postgres'
import { findAllSubmissions } from './findAllSubmissions'
import { findAllSubmissionsWithRevisions } from './findAllSubmissionsWithRevisions'
import { findDraftSubmission } from './findDraftSubmission'
import { findStateSubmission } from './findStateSubmission'
import { findSubmissionWithRevisions } from './findSubmissionWithRevisions'
import {
    insertDraftSubmission,
    InsertDraftSubmissionArgsType,
} from './insertDraftSubmission'
import { insertSubmissionRevision } from './insertSubmissionRevision'
import { StoreError } from './storeError'
import { updateDraftSubmission } from './updateDraftSubmission'
import { updateFormData } from './updateFormData'
import { updateStateSubmission } from './updateStateSubmission'

type Store = {
    insertDraftSubmission: (
        args: InsertDraftSubmissionArgsType
    ) => Promise<HealthPlanPackageType | StoreError>

    findAllSubmissions: (
        stateCode: string
    ) => Promise<
        | (UnlockedHealthPlanFormDataType | LockedHealthPlanFormDataType)[]
        | StoreError
    >

    findDraftSubmission: (
        draftUUID: string
    ) => Promise<UnlockedHealthPlanFormDataType | undefined | StoreError>

    findDraftSubmissionByStateNumber: (
        stateCoder: string,
        stateNumber: number
    ) => Promise<UnlockedHealthPlanFormDataType | undefined | StoreError>

    updateDraftSubmission: (
        draftSubmission: UnlockedHealthPlanFormDataType
    ) => Promise<UnlockedHealthPlanFormDataType | StoreError>

    findStateSubmission: (
        draftUUID: string
    ) => Promise<LockedHealthPlanFormDataType | undefined | StoreError>

    updateStateSubmission: (
        stateSubmission: LockedHealthPlanFormDataType,
        submitInfo: UpdateInfoType
    ) => Promise<HealthPlanPackageType | StoreError>

    insertNewRevision: (
        submissionID: string,
        unlockInfo: UpdateInfoType,
        draft: UnlockedHealthPlanFormDataType
    ) => Promise<HealthPlanPackageType | StoreError>

    updateFormData: (
        submissionID: string,
        revisionID: string,
        formData: UnlockedHealthPlanFormDataType
    ) => Promise<HealthPlanPackageType | StoreError>

    findPrograms: (
        stateCode: string,
        programIDs: Array<string>
    ) => ProgramT[] | undefined

    // new api
    findSubmissionWithRevisions: (
        draftUUID: string
    ) => Promise<HealthPlanPackageType | undefined | StoreError>

    findAllSubmissionsWithRevisions: (
        stateCode: string
    ) => Promise<HealthPlanPackageType[] | StoreError>
}

function NewPostgresStore(client: PrismaClient): Store {
    return {
        findAllSubmissions: (stateCode) =>
            findAllSubmissions(client, stateCode),
        insertDraftSubmission: (args) => insertDraftSubmission(client, args),
        findDraftSubmission: (draftUUID) =>
            findDraftSubmission(client, draftUUID),
        findSubmissionWithRevisions: (id) =>
            findSubmissionWithRevisions(client, id),
        findAllSubmissionsWithRevisions: (stateCode) =>
            findAllSubmissionsWithRevisions(client, stateCode),
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        findDraftSubmissionByStateNumber: (_stateCode, _stateNumber) => {
            throw new Error('UNIMPLEMENTED')
        },
        updateDraftSubmission: (draftSubmission) =>
            updateDraftSubmission(client, draftSubmission),
        updateFormData: (submissionID, revisionID, formData) =>
            updateFormData(client, submissionID, revisionID, formData),
        updateStateSubmission: (submission, submitInfo) =>
            updateStateSubmission(client, submission, submitInfo),
        findStateSubmission: (submissionID) =>
            findStateSubmission(client, submissionID),
        insertNewRevision: (submissionID, unlockInfo, draft) =>
            insertSubmissionRevision(client, {
                submissionID,
                unlockInfo,
                draft,
            }),
        findPrograms: findPrograms,
    }
}

export { NewPostgresStore, Store }
