import { PrismaClient } from '@prisma/client'
import {
    DraftSubmissionType,
    isDraftSubmission
} from '../../app-web/src/common-code/domain-models'
import { toDomain } from '../../app-web/src/common-code/proto/stateSubmission'
import {
    convertPrismaErrorToStoreError,
    isStoreError,
    StoreError
} from './storeError'
import {
    getCurrentRevision,
    StateSubmissionWithRevisions
} from './submissionWithRevisionsHelpers'

export async function findUniqueSubmissionWrapper(
    client: PrismaClient,
    id: string
): Promise<StateSubmissionWithRevisions | StoreError | undefined> {
    try {
        const findResult = await client.stateSubmission.findUnique({
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
): Promise<DraftSubmissionType | undefined | StoreError> {
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
    
    const decodeResult = toDomain(currentRevision.submissionFormProto)

    if (decodeResult instanceof Error) {
        console.log('ERROR: decoding protobuf; id: ', draftUUID, decodeResult)
        return {
            code: 'PROTOBUF_ERROR',
            message: 'bad proto read',
        }
    }

    if (!isDraftSubmission(decodeResult)) {
        return {
            code: 'WRONG_STATUS',
            message: 'wrong type came out!',
        }
    }

    const draft: DraftSubmissionType = decodeResult

    return draft
}
