import { PrismaClient } from '@prisma/client'
import {
    UnlockedHealthPlanFormDataType,
    ProgramT,
    LockedHealthPlanFormDataType,
    HealthPlanPackageType,
    UpdateInfoType,
} from '../../app-web/src/common-code/domain-models'
import { findPrograms } from '../postgres'
import { findAllSubmissionsWithRevisions } from './findAllSubmissionsWithRevisions'
import { findSubmissionWithRevisions } from './findSubmissionWithRevisions'
import {
    insertDraftSubmission,
    InsertDraftSubmissionArgsType,
} from './insertDraftSubmission'
import { insertSubmissionRevision } from './insertSubmissionRevision'
import { StoreError } from './storeError'
import { updateFormData } from './updateFormData'
import { updateStateSubmission } from './updateStateSubmission'

type Store = {
    insertDraftSubmission: (
        args: InsertDraftSubmissionArgsType
    ) => Promise<HealthPlanPackageType | StoreError>

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

    findSubmissionWithRevisions: (
        draftUUID: string
    ) => Promise<HealthPlanPackageType | undefined | StoreError>

    findAllSubmissionsWithRevisions: (
        stateCode: string
    ) => Promise<HealthPlanPackageType[] | StoreError>
}

function NewPostgresStore(client: PrismaClient): Store {
    return {
        insertDraftSubmission: (args) => insertDraftSubmission(client, args),
        findSubmissionWithRevisions: (id) =>
            findSubmissionWithRevisions(client, id),
        findAllSubmissionsWithRevisions: (stateCode) =>
            findAllSubmissionsWithRevisions(client, stateCode),
        updateFormData: (submissionID, revisionID, formData) =>
            updateFormData(client, submissionID, revisionID, formData),
        updateStateSubmission: (submission, submitInfo) =>
            updateStateSubmission(client, submission, submitInfo),
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
