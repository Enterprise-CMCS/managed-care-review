import { PrismaClient } from '@prisma/client'
import { Store } from '../store/store'
import { findProgram } from '../store/findProgram'

import { findAllSubmissions } from './findAllSubmissions'
import { insertDraftSubmission } from './insertDraftSubmission'
import { updateDraftSubmission } from './updateDraftSubmission'
import { findDraftSubmission } from './findDraftSubmission'

export function NewPostgresStore(client: PrismaClient): Store {
    return {
        findAllSubmissions: (stateCode) =>
            findAllSubmissions(client, stateCode),
        insertDraftSubmission: (args) => insertDraftSubmission(client, args),
        findDraftSubmission: (draftUUID) =>
            findDraftSubmission(client, draftUUID),
        findDraftSubmissionByStateNumber: (stateCode, stateNumber) => {
            throw new Error('UNIMPLEMENTED')
        },
        updateDraftSubmission: (draftSubmission) =>
            updateDraftSubmission(client, draftSubmission),
        updateStateSubmission: (submissionID) => {
            throw new Error('UNIMPLEMENTED')
        },
        findStateSubmission: (submissionID) => {
            throw new Error('UNIMPLEMENTED')
        },
        findProgram: findProgram,
    }
}
