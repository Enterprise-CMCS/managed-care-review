import { PrismaClient } from '@prisma/client'
import {
    UnlockedHealthPlanFormDataType,
    HealthPlanPackageType,
} from '../../app-web/src/common-code/domain-models'
import { toProtoBuffer } from '../../app-web/src/common-code/proto/stateSubmission'
import {
    convertPrismaErrorToStoreError,
    isStoreError,
    StoreError,
} from './storeError'
import {
    convertToHealthPlanPackageType,
    HealthPlanPackageWithRevisionsTable,
} from './submissionWithRevisionsHelpers'

export async function updateRevisionWrapper(
    client: PrismaClient,
    submissionID: string,
    revisionID: string,
    proto: Buffer
): Promise<HealthPlanPackageWithRevisionsTable | StoreError> {
    try {
        const updateResult = await client.healthPlanPackageTable.update({
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
                            formDataProto: proto,
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
    formData: UnlockedHealthPlanFormDataType
): Promise<HealthPlanPackageType | StoreError> {
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

    return convertToHealthPlanPackageType(updateResult)
}
