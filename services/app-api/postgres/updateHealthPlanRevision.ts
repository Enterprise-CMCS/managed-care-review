import { HealthPlanRevisionTable, PrismaClient } from '@prisma/client'
import {
    HealthPlanPackageType,
    HealthPlanFormDataType,
    UpdateInfoType,
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
    proto: Buffer,
    submitInfo?: UpdateInfoType
): Promise<HealthPlanPackageWithRevisionsTable | StoreError> {
    const revisionBody: Partial<HealthPlanRevisionTable> = {
        formDataProto: proto,
    }

    if (submitInfo) {
        revisionBody.submittedAt = submitInfo.updatedAt
        revisionBody.submittedBy = submitInfo.updatedBy
        revisionBody.submittedReason = submitInfo.updatedReason
    }

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
                        data: revisionBody,
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

export async function updateHealthPlanRevision(
    client: PrismaClient,
    submissionID: string,
    revisionID: string,
    formData: HealthPlanFormDataType,
    submitInfo?: UpdateInfoType
): Promise<HealthPlanPackageType | StoreError> {
    formData.updatedAt = new Date()

    const proto = toProtoBuffer(formData)
    const buffer = Buffer.from(proto)

    const updateResult = await updateRevisionWrapper(
        client,
        submissionID,
        revisionID,
        buffer,
        submitInfo
    )

    if (isStoreError(updateResult)) {
        return updateResult
    }

    return convertToHealthPlanPackageType(updateResult)
}
