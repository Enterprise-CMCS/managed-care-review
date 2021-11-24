import { PrismaClient } from '@prisma/client'
import {
    isStateSubmission,
    StateSubmissionType,
} from '../../app-web/src/common-code/domain-models'
import {
    toDomain,
    toProtoBuffer,
} from '../../app-web/src/common-code/proto/stateSubmission'
import { StoreError, isStoreError } from './storeError'
import { updateSubmissionWrapper } from './updateDraftSubmission'

export async function updateStateSubmission(
    client: PrismaClient,
    stateSubmission: StateSubmissionType
): Promise<StateSubmissionType | StoreError> {
    stateSubmission.updatedAt = new Date()

    const proto = toProtoBuffer(stateSubmission)
    const buffer = Buffer.from(proto)

    const updateResult = await updateSubmissionWrapper(
        client,
        stateSubmission.id,
        buffer
    )

    if (isStoreError(updateResult)) {
        return updateResult
    }

    const decodeUpdated = toDomain(updateResult)

    if (decodeUpdated instanceof Error) {
        console.log(
            'ERROR: decoding protobuf with id: ',
            stateSubmission.id,
            decodeUpdated
        )
        return {
            code: 'PROTOBUF_ERROR',
            message: 'Error decoding protobuf',
        }
    }

    if (!isStateSubmission(decodeUpdated)) {
        return {
            code: 'WRONG_STATUS',
            message: 'The updated submission is not a DraftSubmission',
        }
    }

    return decodeUpdated
}
