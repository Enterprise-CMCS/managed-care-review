import { PrismaClient } from '@prisma/client'
import { v4 as uuidv4 } from 'uuid'
import { Buffer } from 'buffer'

import {
    DraftSubmissionType,
    SubmissionType,
    isDraftSubmission,
} from '../../app-web/src/common-code/domain-models'

import { toProtoBuffer } from '../../app-web/src/common-code/proto/stateSubmission'

import { StoreError, isStoreError } from '../store/storeError'
import { PrismaClientInitializationError } from '@prisma/client/runtime'

export type InsertDraftSubmissionArgsType = {
    stateCode: string
    programID: string
    submissionType: SubmissionType
    submissionDescription: string
}

export async function insertDraftSubmission(
    client: PrismaClient,
    args: InsertDraftSubmissionArgsType
): Promise<DraftSubmissionType | StoreError> {
    // TODO, calculate this.
    const stateNumber = 4

    console.log('INSERTING', args.submissionType)

    // construct a new Draft Submission
    const draft: DraftSubmissionType = {
        id: uuidv4(),
        createdAt: new Date(),
        updatedAt: new Date(),
        stateNumber,
        status: 'DRAFT',
        submissionType: args.submissionType,
        programID: args.programID,
        submissionDescription: args.submissionDescription,
        stateCode: args.stateCode,

        documents: [],
        stateContacts: [],
        actuaryContacts: [],
        managedCareEntities: [],
        federalAuthorities: [],
    }

    const protobuf = toProtoBuffer(draft)

    const buffer = Buffer.from(protobuf)

    try {
        const result = await client.stateSubmission.create({
            data: {
                id: draft.id,
                stateCode: draft.stateCode,
                // createAt: draft.createdAt,
                submissionFormProto: buffer,
            },
        })
    } catch (e) {
        console.log('ERROR: talking to the database: ', e.name, e)

        if (e instanceof PrismaClientInitializationError) {
            console.log('CONNECTION ERROR', e.message, e.errorCode)
            return {
                code: 'CONNECTION_ERROR',
                message: e.message,
            }
        }

        return {
            code: 'UNEXPECTED_EXCEPTION',
            message: 'unknown error',
        }
    }

    return draft
}
