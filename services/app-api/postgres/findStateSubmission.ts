import { PrismaClient } from '@prisma/client'
import {
    isLockedHealthPlanFormData,
    LockedHealthPlanFormDataType,
} from '../../app-web/src/common-code/domain-models'
import { toDomain } from '../../app-web/src/common-code/proto/stateSubmission'
import { findUniqueSubmissionWrapper } from './findDraftSubmission'
import { isStoreError, StoreError } from './storeError'
import { getCurrentRevision } from './submissionWithRevisionsHelpers'

export async function findStateSubmission(
    client: PrismaClient,
    id: string
): Promise<LockedHealthPlanFormDataType | undefined | StoreError> {
    const findResult = await findUniqueSubmissionWrapper(client, id)

    if (isStoreError(findResult)) {
        return findResult
    }

    if (findResult === undefined) {
        return findResult
    }

    const currentRevisionOrError = getCurrentRevision(id, findResult)
    if (isStoreError(currentRevisionOrError)) return currentRevisionOrError
    const currentRevision = currentRevisionOrError

    const decodeResult = toDomain(currentRevision.submissionFormProto)

    if (decodeResult instanceof Error) {
        console.log('ERROR: decoding protobuf; id: ', id, decodeResult)
        return {
            code: 'PROTOBUF_ERROR',
            message: 'bad proto read',
        }
    }

    if (!isLockedHealthPlanFormData(decodeResult)) {
        return {
            code: 'WRONG_STATUS',
            message: 'wrong type came out!',
        }
    }

    const draft: LockedHealthPlanFormDataType = decodeResult

    return draft
}
