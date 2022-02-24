import { PrismaClient } from '@prisma/client'
import {
    isStateSubmission,
    StateSubmissionType
} from '../../app-web/src/common-code/domain-models'
import {
    toDomain,
    toProtoBuffer
} from '../../app-web/src/common-code/proto/stateSubmission'
import { convertPrismaErrorToStoreError, isStoreError, StoreError } from './storeError'
import { getCurrentRevision } from './submissionWithRevisionsHelpers'

async function submitStateSubmissionWrapper(
    client: PrismaClient,
    id: string,
    submittedAt: Date,
    proto: Buffer
): Promise<Buffer | StoreError> {

    try {
        const findResult = await client.stateSubmission.findUnique({
            where: {
                id: id,
            },
            include: {
                revisions: true
            },
        })

        const currentRevisionOrError = getCurrentRevision(id, findResult)
        if (isStoreError(currentRevisionOrError)) {
             return currentRevisionOrError
        } 

        try {
            const currentRevision = currentRevisionOrError
            const updateResult = await client.stateSubmission.update( {
                where: {
                    id
                },
                data: {
                    revisions: {
                        update: {
                            where: {
                                id:  currentRevision.id
                            },
                            data: {
                                submissionFormProto: proto,
                                submittedAt,
                            }
                        }
                    }
                },
                    include: {
                    revisions: true
                },
            })

            const updatedRevisionOrError = getCurrentRevision(id, updateResult)
            if (isStoreError(updatedRevisionOrError)) {
                return updatedRevisionOrError
            } else {
                const updatedRevision = updatedRevisionOrError
                return updatedRevision.submissionFormProto
            }
        } catch (updateError) {
            return convertPrismaErrorToStoreError(updateError)
        }
        
    } catch (findError) {
        return convertPrismaErrorToStoreError(findError)
    }
}


export async function updateStateSubmission(
    client: PrismaClient,
    stateSubmission: StateSubmissionType,
    submittedAt: Date,
): Promise<StateSubmissionType | StoreError> {
    stateSubmission.updatedAt = new Date()

    const proto = toProtoBuffer(stateSubmission)
    const buffer = Buffer.from(proto)

    const updateResult = await submitStateSubmissionWrapper(
        client,
        stateSubmission.id,
        submittedAt,
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
