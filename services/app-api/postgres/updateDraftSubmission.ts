import { PrismaClient } from '@prisma/client'
import {
    DraftSubmissionType,
    isDraftSubmission,
} from '../../app-web/src/common-code/domain-models'
import {
    toDomain,
    toProtoBuffer,
} from '../../app-web/src/common-code/proto/stateSubmission'
import {
    convertPrismaErrorToStoreError,
    isStoreError,
    StoreError,
} from './storeError'

export async function updateSubmissionWrapper(
    client: PrismaClient,
    id: string,
    proto: Buffer
): Promise<Buffer | StoreError> {
    try {
        const updateResult = await client.stateSubmission.update({
            where: {
                id: id,
            },
            data: {
                submissionFormProto: proto,
            },
        })

        return updateResult.submissionFormProto
    } catch (e) {
        return convertPrismaErrorToStoreError(e)
    }
}

export async function updateDraftSubmission(
    client: PrismaClient,
    draftSubmission: DraftSubmissionType
): Promise<DraftSubmissionType | StoreError> {
    draftSubmission.updatedAt = new Date()

    const proto = toProtoBuffer(draftSubmission)
    const buffer = Buffer.from(proto)

    const updateResult = await updateSubmissionWrapper(
        client,
        draftSubmission.id,
        buffer
    )

    if (isStoreError(updateResult)) {
        return updateResult
    }

    const decodeUpdated = toDomain(updateResult)

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

    return decodeUpdated
}
