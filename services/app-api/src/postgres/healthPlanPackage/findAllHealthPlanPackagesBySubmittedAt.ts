import type { PrismaClient } from '@prisma/client'
import type { HealthPlanPackageType } from '../../domain-models'
import { packageStatus } from '../../domain-models'
import type { StoreError } from '../storeError'
import { convertPrismaErrorToStoreError, isStoreError } from '../storeError'
import type { HealthPlanPackageWithRevisionsTable } from './healthPlanPackageHelpers'
import {
    convertToHealthPlanPackageType,
    getCurrentRevision,
} from './healthPlanPackageHelpers'

export async function findAllPackagesWrapper(
    client: PrismaClient
): Promise<HealthPlanPackageWithRevisionsTable[] | StoreError> {
    try {
        const result = await client.healthPlanPackageTable.findMany({
            where: {
                revisions: { some: { submittedAt: { not: null } } }, // drafts have no submission status
                stateCode: { not: 'AS' }, // exclude test state as per ADR 019
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
        console.error('failed to findAll', e)
        return convertPrismaErrorToStoreError(e)
    }
}

export async function findAllHealthPlanPackagesBySubmittedAt(
    client: PrismaClient
): Promise<HealthPlanPackageType[] | StoreError> {
    const findResult = await findAllPackagesWrapper(client)

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
            console.error(
                `ERROR submission ${submissionWithRevisions.id} does not have a current revision`
            )
            console.error(
                `ERROR findAllHealthPlanPackagesBySubmittedAt has no revisions. There are ${errors.length} error(s)`
            )
            return
        }

        const submission = convertToHealthPlanPackageType(
            submissionWithRevisions
        )

        if (packageStatus(submission) === 'DRAFT') {
            console.error(
                'We should not be fetching draft submissions for CMS Users'
            )
        } else {
            submissions.push(submission)
        }
    })

    // only return packages with valid revisions
    return submissions
}
