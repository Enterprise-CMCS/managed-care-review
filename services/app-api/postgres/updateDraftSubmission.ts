import { PrismaClient } from '@prisma/client'

import { StoreError, isStoreError } from '../store/storeError'

import {
    DraftSubmissionType,
    isDraftSubmission,
} from '../../app-web/src/common-code/domain-models'
import {
    toDomain,
    toProtoBuffer,
} from '../../app-web/src/common-code/proto/stateSubmission'

export async function updateDraftSubmission(
    client: PrismaClient,
    draftSubmission: DraftSubmissionType
): Promise<DraftSubmissionType | StoreError> {
    draftSubmission.updatedAt = new Date()

    const proto = toProtoBuffer(draftSubmission)
    const buffer = Buffer.from(proto)

    console.log('UPDATING', draftSubmission.submissionType)

    let updateResult = undefined
    try {
        updateResult = await client.stateSubmission.update({
            where: {
                id: draftSubmission.id,
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
            draftSubmission.id,
            decodeUpdated
        )
        return {
            code: 'PROTOBUF_ERROR',
            message: 'Error decoding protobuf',
        }
    }

    if (!isDraftSubmission(decodeUpdated)) {
        return {
            code: 'WRONG_STATUS',
            message: 'The updated submission is not a DraftSubmission',
        }
    }
    console.log('UPDATEd', decodeUpdated)

    return decodeUpdated
}
