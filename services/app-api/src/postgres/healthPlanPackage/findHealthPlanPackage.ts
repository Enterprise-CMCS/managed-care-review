import { PrismaClient } from '@prisma/client'
import { HealthPlanPackageType } from '../../domain-models'
import {
    convertPrismaErrorToStoreError,
    isStoreError,
    StoreError,
} from '../storeError'
import {
    convertToHealthPlanPackageType,
    HealthPlanPackageWithRevisionsTable,
    setQuestionUserTypeAsCMS,
} from './healthPlanPackageHelpers'

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
                questions: {
                    include: {
                        addedBy: {
                            include: {
                                stateAssignments: true,
                            },
                        },
                        documents: true,
                    },
                    orderBy: {
                        createdAt: 'desc',
                    },
                },
            },
        })

        if (!findResult) {
            return undefined
        }

        const result = {
            ...findResult,
            questions: setQuestionUserTypeAsCMS(findResult.questions),
        }

        return result
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
