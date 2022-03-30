import { PrismaClient } from '@prisma/client'
import { Submission2Type } from '../../app-web/src/common-code/domain-models'
import { findAllSubmissionWrapper } from './findAllSubmissions'
import {
    isStoreError,
    StoreError
} from './storeError'
import { convertToSubmission2Type, getCurrentRevision } from './submissionWithRevisionsHelpers'



export async function findAllSubmissionsWithRevisions(
    client: PrismaClient,
    stateCode: string
): Promise<Submission2Type[] | StoreError> {
    const findResult = await findAllSubmissionWrapper(client, stateCode)

    if (isStoreError(findResult)) {
        return findResult
    }

    if (findResult === undefined) {
        return findResult
    }

    const submissions: Submission2Type[] = []
    const errors: Error | StoreError[] = []
    findResult.forEach((submissionWithRevisions) => {
        // check for current revision, if it doesn't exist, log an error
        const currentRevisionOrError = getCurrentRevision(
            submissionWithRevisions.id,
            submissionWithRevisions
        )
        if (isStoreError(currentRevisionOrError)) {
             console.log(
                 `ERROR submission ${submissionWithRevisions.id} does not have a current revision`
             )
            console.log(`ERROR findAllSubmissionsWithRevisions for ${stateCode} has ${errors.length} error(s)`)
            return
        }
        const submission = convertToSubmission2Type(submissionWithRevisions)
        submissions.push(submission)
    })
    // only return packages with valid revisions
    return submissions
}
