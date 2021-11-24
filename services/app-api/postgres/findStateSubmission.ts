import { PrismaClient } from '@prisma/client'
import {
    isStateSubmission,
    StateSubmissionType,
} from '../../app-web/src/common-code/domain-models'
import { toDomain } from '../../app-web/src/common-code/proto/stateSubmission'
import { findUniqueSubmissionWrapper } from './findDraftSubmission'
import { isStoreError, StoreError } from './storeError'

export async function findStateSubmission(
    client: PrismaClient,
    id: string
): Promise<StateSubmissionType | undefined | StoreError> {
    const findResult = await findUniqueSubmissionWrapper(client, id)

    if (isStoreError(findResult)) {
        return findResult
    }

    if (findResult === undefined) {
        return findResult
    }

    const decodeResult = toDomain(findResult.submissionFormProto)

    if (decodeResult instanceof Error) {
        console.log('ERROR: decoding protobuf; id: ', id, decodeResult)
        return {
            code: 'PROTOBUF_ERROR',
            message: 'bad proto read',
        }
    }

    if (!isStateSubmission(decodeResult)) {
        return {
            code: 'WRONG_STATUS',
            message: 'wrong type came out!',
        }
    }

    const draft: StateSubmissionType = decodeResult

    return draft
}
