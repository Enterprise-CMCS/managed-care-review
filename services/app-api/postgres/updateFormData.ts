import { PrismaClient } from '@prisma/client'
import {
    DraftSubmissionType,
    Submission2Type,
} from '../../app-web/src/common-code/domain-models'
import { toProtoBuffer } from '../../app-web/src/common-code/proto/stateSubmission'
import {
    convertPrismaErrorToStoreError,
    isStoreError,
    StoreError,
} from './storeError'
import {
    convertToSubmission2Type,
    StateSubmissionWithRevisions,
} from './submissionWithRevisionsHelpers'

export async function updateRevisionWrapper(
    client: PrismaClient,
    submissionID: string,
    revisionID: string,
    proto: Buffer
): Promise<StateSubmissionWithRevisions | StoreError> {
    try {
        const updateResult = await client.stateSubmission.update({
            where: {
                id: submissionID,
            },
            data: {
                revisions: {
                    update: {
                        where: {
                            id: revisionID,
                        },
                        data: {
                            submissionFormProto: proto,
                        },
                    },
                },
            },
            include: {
                revisions: {
                    orderBy: {
                        createdAt: 'desc', // We expect our revisions most-recent-first
                    },
                },
            },
        })

        return updateResult
    } catch (updateError) {
        return convertPrismaErrorToStoreError(updateError)
    }
}

export async function updateFormData(
    client: PrismaClient,
    submissionID: string,
    revisionID: string,
    formData: DraftSubmissionType
): Promise<Submission2Type | StoreError> {
    formData.updatedAt = new Date()

    const proto = toProtoBuffer(formData)
    const buffer = Buffer.from(proto)

    const updateResult = await updateRevisionWrapper(
        client,
        submissionID,
        revisionID,
        buffer
    )

    if (isStoreError(updateResult)) {
        return updateResult
    }

    return convertToSubmission2Type(updateResult)
}
