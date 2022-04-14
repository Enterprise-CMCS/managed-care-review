import { PrismaClient } from '@prisma/client'
import { HealthPlanPackageType } from '../../app-web/src/common-code/domain-models'
import {
    convertPrismaErrorToStoreError,
    isStoreError,
    StoreError,
} from './storeError'
import {
    convertToHealthPlanPackageType,
    getCurrentRevision,
    HealthPlanPackageWithRevisionsTable,
} from './submissionWithRevisionsHelpers'

export async function findAllSubmissionWrapper(
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
        console.log('failed to findAll', e)
        return convertPrismaErrorToStoreError(e)
    }
}

export async function findAllHealthPlanPackages(
    client: PrismaClient,
    stateCode: string
): Promise<HealthPlanPackageType[] | StoreError> {
    const findResult = await findAllSubmissionWrapper(client, stateCode)

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
            console.log(
                `ERROR submission ${submissionWithRevisions.id} does not have a current revision`
            )
            console.log(
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
