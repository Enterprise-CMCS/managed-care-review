import { PrismaClient, StateSubmission, StateSubmissionRevision } from '@prisma/client'
import {
    DraftSubmissionType,
    isDraftSubmission,
} from '../../app-web/src/common-code/domain-models'
import {
    toDomain,
    toProtoBuffer,
} from '../../app-web/src/common-code/proto/stateSubmission'
import {
    convertPrismaErrorToStoreError,
    isStoreError,
    StoreError,
} from './storeError'

type SubmissionWithRevisions = StateSubmission & {
    revisions: StateSubmissionRevision[];
}
// Used validate prisma results have useable submission with existing revision
const getCurrentRevision = (submissionID: string, submissionResult: SubmissionWithRevisions | null): StateSubmissionRevision| StoreError => {
    if (!submissionResult)
        return {
            code: 'UNEXPECTED_EXCEPTION' as const,
            message: `No submission found for id: ${submissionID}`,
        }

    if (!submissionResult.revisions || submissionResult.revisions.length < 1)
        return {
            code: 'UNEXPECTED_EXCEPTION' as const,
            message: `No revisions found for submission id: ${submissionID}`,
        }

    // TODO FIGURE OUT HOW TO ENSURE PROPERLY ORDERED REVISIONS HERE
    return submissionResult.revisions[0]
}

export async function updateSubmissionWrapper(
    client: PrismaClient,
    id: string,
    proto: Buffer
): Promise<Buffer | StoreError> {

    try {
        const findResult = await client.stateSubmission.findUnique({
            where: {
                id: id,
            },
            include: {
                revisions: true
            },
        })

        const currentRevisionOrError = getCurrentRevision(id, findResult)
        if (isStoreError(currentRevisionOrError)) {
             return currentRevisionOrError
        } 

        try {
            const currentRevision = currentRevisionOrError
            const updateResult = await client.stateSubmission.update( {
                where: {
                    id
                },
                data: {
                    revisions: {
                        update: {
                            where: {
                                id:  currentRevision.id
                            },
                            data: {
                                submissionFormProto: proto
                            }
                        }
                    }
                },
                    include: {
                    revisions: true
                },
            })
            const updatedRevisionOrError = getCurrentRevision(id, updateResult)
            if (isStoreError(updatedRevisionOrError)) {
                return updatedRevisionOrError
            } else {
                const updatedRevision = updatedRevisionOrError
                return updatedRevision.submissionFormProto
            }
        } catch (updateError) {
            return convertPrismaErrorToStoreError(updateError)
        }
        
    } catch (findError) {
        return convertPrismaErrorToStoreError(findError)
    }
}

export async function updateDraftSubmission(
    client: PrismaClient,
    draftSubmission: DraftSubmissionType
): Promise<DraftSubmissionType | StoreError> {
    draftSubmission.updatedAt = new Date()

    const proto = toProtoBuffer(draftSubmission)
    const buffer = Buffer.from(proto)

    const updateResult = await updateSubmissionWrapper(
        client,
        draftSubmission.id,
        buffer
    )

    if (isStoreError(updateResult)) {
        return updateResult
    }

    const decodeUpdated = toDomain(updateResult)

    if (decodeUpdated instanceof Error) {
        console.log(
            'ERROR: decoding protobuf with id: ',
            draftSubmission.id,
            decodeUpdated
        )
        return {
            code: 'PROTOBUF_ERROR',
            message: 'Error decoding protobuf',
        }
    }

    if (!isDraftSubmission(decodeUpdated)) {
        return {
            code: 'WRONG_STATUS',
            message: 'The updated submission is not a DraftSubmission',
        }
    }

    return decodeUpdated
}
