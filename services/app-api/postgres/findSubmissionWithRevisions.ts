import { PrismaClient } from '@prisma/client'
import {
    Submission2Type,
    UpdateInfoType
} from '../../app-web/src/common-code/domain-models'
import { findUniqueSubmissionWrapper } from './findDraftSubmission'
import { isStoreError, StoreError } from './storeError'
import { convertToSubmission2Type } from './submissionWithRevisionsHelpers'

export async function findSubmissionWithRevisions(
    client: PrismaClient,
    id: string
): Promise<Submission2Type | undefined | StoreError> {
    const findResult = await findUniqueSubmissionWrapper(client, id)

    if (isStoreError(findResult)) {
        return findResult
    }

    if (findResult === undefined) {
        return findResult
    }

    const submission = convertToSubmission2Type(findResult)

    return submission
}
