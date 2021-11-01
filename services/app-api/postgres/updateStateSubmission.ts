import { PrismaClient } from '@prisma/client'

import { StoreError, isStoreError } from '../store/storeError'

import {
    StateSubmissionType,
    isStateSubmission,
} from '../../app-web/src/common-code/domain-models'
import {
    toDomain,
    toProtoBuffer,
} from '../../app-web/src/common-code/proto/stateSubmission'

export async function updateStateSubmission(
    client: PrismaClient,
    stateSubmission: StateSubmissionType
): Promise<StateSubmissionType | StoreError> {
    stateSubmission.updatedAt = new Date()

    const proto = toProtoBuffer(stateSubmission)
    const buffer = Buffer.from(proto)

    console.log('UPDATING STATE', stateSubmission.submissionType)

    let updateResult = undefined
    try {
        updateResult = await client.stateSubmission.update({
            where: {
                id: stateSubmission.id,
            },
            data: {
                submissionFormProto: buffer,
            },
        })
    } catch (e) {
        return {
            code: 'UNEXPECTED_EXCEPTION',
            message:
                "still haven't figured out what kinds of errors we can get here",
        }
    }

    const decodeUpdated = toDomain(updateResult.submissionFormProto)

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
    console.log('UPDATEd', decodeUpdated)

    return decodeUpdated
}
