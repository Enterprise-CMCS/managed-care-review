import { HealthPlanRevisionTable, PrismaClient } from '@prisma/client'
import { HealthPlanFormDataType } from '@managed-care-review/common-code/healthPlanFormDataType'
import { toProtoBuffer } from '@managed-care-review/common-code/proto'
import { UpdateInfoType, HealthPlanPackageType } from '../../domain-models'
import {
    convertPrismaErrorToStoreError,
    isStoreError,
    StoreError,
} from '../storeError'
import {
    convertToHealthPlanPackageType,
    HealthPlanPackageWithRevisionsTable,
} from './healthPlanPackageHelpers'

export async function updateRevisionWrapper(
    client: PrismaClient,
    pkgID: string,
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
                id: pkgID,
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
    pkgID: string,
    revisionID: string,
    formData: HealthPlanFormDataType,
    submitInfo?: UpdateInfoType
): Promise<HealthPlanPackageType | StoreError> {
    formData.updatedAt = new Date()

    const proto = toProtoBuffer(formData)
    const buffer = Buffer.from(proto)

    const updateResult = await updateRevisionWrapper(
        client,
        pkgID,
        revisionID,
        buffer,
        submitInfo
    )

    if (isStoreError(updateResult)) {
        return updateResult
    }

    return convertToHealthPlanPackageType(updateResult)
}
