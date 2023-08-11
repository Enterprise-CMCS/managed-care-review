import type { PrismaClient } from '@prisma/client'
import type { HealthPlanPackageType } from '../../domain-models'
import type { StoreError } from '../storeError'
import { convertPrismaErrorToStoreError, isStoreError } from '../storeError'
import type { HealthPlanPackageWithRevisionsTable } from './healthPlanPackageHelpers'
import {
    convertToHealthPlanPackageType,
    getCurrentRevision,
} from './healthPlanPackageHelpers'

export async function findAllPackagesWrapper(
    client: PrismaClient,
    stateCode: string
): Promise<HealthPlanPackageWithRevisionsTable[] | StoreError> {
    try {
        const result = await client.healthPlanPackageTable.findMany({
            where: {
                stateCode: {
                    equals: stateCode,
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
        return result
    } catch (e: unknown) {
        console.info('failed to findAll', e)
        return convertPrismaErrorToStoreError(e)
    }
}

export async function findAllHealthPlanPackagesByState(
    client: PrismaClient,
    stateCode: string
): Promise<HealthPlanPackageType[] | StoreError> {
    const findResult = await findAllPackagesWrapper(client, stateCode)

    if (isStoreError(findResult)) {
        return findResult
    }

    if (findResult === undefined) {
        return findResult
    }

    const submissions: HealthPlanPackageType[] = []
    const errors: Error | StoreError[] = []
    findResult.forEach((submissionWithRevisions) => {
        // check for current revision, if it doesn't exist, log an error
        const currentRevisionOrError = getCurrentRevision(
            submissionWithRevisions.id,
            submissionWithRevisions
        )
        if (isStoreError(currentRevisionOrError)) {
            console.info(
                `ERROR submission ${submissionWithRevisions.id} does not have a current revision`
            )
            console.info(
                `ERROR findAllSubmissionsWithRevisions for ${stateCode} has ${errors.length} error(s)`
            )
            return
        }
        const submission = convertToHealthPlanPackageType(
            submissionWithRevisions
        )
        submissions.push(submission)
    })
    // only return packages with valid revisions
    return submissions
}
