import { PrismaClient } from '@prisma/client'
import { v4 as uuidv4 } from 'uuid'
import {
    DraftSubmissionType, Submission2Type, UpdateInfoType
} from '../../app-web/src/common-code/domain-models'
import { toProtoBuffer } from '../../app-web/src/common-code/proto/stateSubmission'
import {
    convertPrismaErrorToStoreError, StoreError
} from './storeError'
import { convertToSubmission2Type } from './submissionWithRevisionsHelpers'

export type InsertSubmissionRevisionArgsType = {
    submissionID: string,
    unlockInfo: UpdateInfoType,
    draft: DraftSubmissionType
}

export async function insertSubmissionRevision(
    client: PrismaClient,
    args: InsertSubmissionRevisionArgsType
): Promise<Submission2Type | StoreError> {

    const protobuf = toProtoBuffer(args.draft)

    const buffer = Buffer.from(protobuf)

    const { unlockInfo, submissionID } = args

    try {
        const submission = await client.stateSubmission.update({
            where: {
                id: submissionID
            },
            data: { 
                revisions: {
                    create: [
                        {  
                            id: uuidv4(),
                            createdAt: new Date(),
                            submissionFormProto: buffer,
                            unlockedAt: unlockInfo.updatedAt,
                            unlockedBy: unlockInfo.updatedBy,
                            unlockedReason: unlockInfo.updatedReason
                        }
                    ]
                }
            },
            include: {
                revisions: {
                    orderBy: {
                        createdAt: 'desc', // We expect our revisions most-recent-first
                    }
                }
            }
        })

        return convertToSubmission2Type(submission)
    } catch (e: unknown) {
        console.log('ERROR: inserting into to the database: ', e)

        return convertPrismaErrorToStoreError(e)
    }
}
