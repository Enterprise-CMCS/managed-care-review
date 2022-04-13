import { PrismaClient } from '@prisma/client'
import {
    UnlockedHealthPlanFormDataType,
    isUnlockedHealthPlanFormData,
} from '../../app-web/src/common-code/domain-models'
import { toDomain } from '../../app-web/src/common-code/proto/stateSubmission'
import {
    convertPrismaErrorToStoreError,
    isStoreError,
    StoreError,
} from './storeError'
import {
    getCurrentRevision,
    HealthPlanPackageWithRevisionsTable,
} from './submissionWithRevisionsHelpers'

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

export async function findDraftSubmission(
    client: PrismaClient,
    draftUUID: string
): Promise<UnlockedHealthPlanFormDataType | undefined | StoreError> {
    const findResult = await findUniqueSubmissionWrapper(client, draftUUID)

    if (isStoreError(findResult)) {
        return findResult
    }

    if (findResult === undefined) {
        return findResult
    }

    const currentRevisionOrError = getCurrentRevision(draftUUID, findResult)
    if (isStoreError(currentRevisionOrError)) return currentRevisionOrError
    const currentRevision = currentRevisionOrError

    const decodeResult = toDomain(currentRevision.formDataProto)

    if (decodeResult instanceof Error) {
        console.log('ERROR: decoding protobuf; id: ', draftUUID, decodeResult)
        return {
            code: 'PROTOBUF_ERROR',
            message: 'bad proto read',
        }
    }

    if (!isUnlockedHealthPlanFormData(decodeResult)) {
        return {
            code: 'WRONG_STATUS',
            message: 'wrong type came out!',
        }
    }

    const draft: UnlockedHealthPlanFormDataType = decodeResult

    return draft
}
