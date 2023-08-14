import type { PrismaClient } from '@prisma/client'
import type { HealthPlanPackageType } from '../../domain-models'
import type { StoreError } from '../storeError'
import { convertPrismaErrorToStoreError, isStoreError } from '../storeError'
import type { HealthPlanPackageWithRevisionsTable } from './healthPlanPackageHelpers'
import { convertToHealthPlanPackageType } from './healthPlanPackageHelpers'

export async function findUniqueSubmissionWrapper(
    client: PrismaClient,
    id: string
): Promise<HealthPlanPackageWithRevisionsTable | StoreError | undefined> {
    try {
        const findResult = await client.healthPlanPackageTable.findUnique({
            where: {
                id: id,
            },
            include: {
                revisions: {
                    orderBy: {
                        createdAt: 'desc', // We expect our revisions most-recent-first
                    },
                },
            },
        })

        if (!findResult) {
            return undefined
        }

        return findResult
    } catch (e: unknown) {
        return convertPrismaErrorToStoreError(e)
    }
}

export async function findHealthPlanPackage(
    client: PrismaClient,
    id: string
): Promise<HealthPlanPackageType | undefined | StoreError> {
    const findResult = await findUniqueSubmissionWrapper(client, id)

    if (isStoreError(findResult)) {
        return findResult
    }

    if (findResult === undefined) {
        return findResult
    }

    const submission = convertToHealthPlanPackageType(findResult)

    return submission
}
