import { PrismaClient } from '@prisma/client'
import { HealthPlanPackageType } from '../../app-web/src/common-code/domain-models'
import { findUniqueSubmissionWrapper } from './findDraftSubmission'
import { isStoreError, StoreError } from './storeError'
import { convertToHealthPlanPackageType } from './submissionWithRevisionsHelpers'

export async function findSubmissionWithRevisions(
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
