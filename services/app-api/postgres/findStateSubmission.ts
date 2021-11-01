import { PrismaClient } from '@prisma/client'

import { StoreError, isStoreError } from '../store/storeError'

import {
    StateSubmissionType,
    isStateSubmission,
} from '../../app-web/src/common-code/domain-models'
import { toDomain } from '../../app-web/src/common-code/proto/stateSubmission'

export async function findStateSubmission(
    client: PrismaClient,
    id: string
): Promise<StateSubmissionType | undefined | StoreError> {
    const findResult = await client.stateSubmission.findUnique({
        where: {
            id: id,
        },
    })

    console.log('FIND RESULT!', findResult)
    if (!findResult) {
        console.log('NO RESULT BACK')
        return undefined
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
