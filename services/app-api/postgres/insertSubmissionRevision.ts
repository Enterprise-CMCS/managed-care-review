import { PrismaClient } from '@prisma/client'
import { v4 as uuidv4 } from 'uuid'
import {
    DraftSubmissionType
} from '../../app-web/src/common-code/domain-models'
import { toProtoBuffer } from '../../app-web/src/common-code/proto/stateSubmission'
import {
    convertPrismaErrorToStoreError, StoreError
} from './storeError'

export type InsertSubmissionRevisionArgsType = {
    submissionID: string
    draft: DraftSubmissionType
}

export async function insertSubmissionRevision(
    client: PrismaClient,
    args: InsertSubmissionRevisionArgsType
): Promise<undefined | StoreError> {

    const protobuf = toProtoBuffer(args.draft)

    const buffer = Buffer.from(protobuf)

    try {
        await client.stateSubmissionRevision.create({
            data: { 
                id: uuidv4(),
                submissionID: args.submissionID,
                createdAt: new Date(),
                submissionFormProto: buffer
            },
        })
    } catch (e: unknown) {
        console.log('ERROR: inserting into to the database: ', e)

        return convertPrismaErrorToStoreError(e)
    }

    return undefined
}
