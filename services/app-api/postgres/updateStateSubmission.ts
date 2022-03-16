import { PrismaClient } from '@prisma/client'
import {
    StateSubmissionType, Submission2Type
} from '../../app-web/src/common-code/domain-models'
import {
    toProtoBuffer
} from '../../app-web/src/common-code/proto/stateSubmission'
import { convertPrismaErrorToStoreError, isStoreError, StoreError } from './storeError'
import { getCurrentRevision } from './submissionWithRevisionsHelpers'

async function submitStateSubmissionWrapper(
    client: PrismaClient,
    id: string,
    submittedAt: Date,
    proto: Buffer
): Promise<Submission2Type | StoreError> {

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
            return await client.stateSubmission.update( {
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
                    revisions: {
                        orderBy: {
                            createdAt: 'desc', // We expect our revisions most-recent-first
                        },
                    }
                },
            })
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
): Promise<Submission2Type | StoreError> {
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

    return updateResult
}
