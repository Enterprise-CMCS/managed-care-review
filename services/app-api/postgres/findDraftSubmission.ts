import { PrismaClient } from '@prisma/client'

import { StoreError, isStoreError } from '../store/storeError'

import {
    DraftSubmissionType,
    isDraftSubmission,
} from '../../app-web/src/common-code/domain-models'
import { toDomain } from '../../app-web/src/common-code/proto/stateSubmission'

export async function findDraftSubmission(
    client: PrismaClient,
    draftUUID: string
): Promise<DraftSubmissionType | undefined | StoreError> {
    const findResult = await client.stateSubmission.findUnique({
        where: {
            id: draftUUID,
        },
    })

    if (!findResult) {
        return undefined
    }

    const decodeResult = toDomain(findResult.submissionFormProto)

    if (decodeResult instanceof Error) {
        console.log('ERROR: decoding protobuf; id: ', draftUUID, decodeResult)
        return {
            code: 'PROTOBUF_ERROR',
            message: 'bad proto read',
        }
    }

    if (!isDraftSubmission(decodeResult)) {
        return {
            code: 'WRONG_STATUS',
            message: 'wrong type came out!',
        }
    }

    const draft: DraftSubmissionType = decodeResult

    return draft
}
