import { PrismaClient } from '@prisma/client'
import { v4 as uuidv4 } from 'uuid'
import { Buffer } from 'buffer'

import {
    DraftSubmissionType,
    SubmissionType,
} from '../../app-web/src/common-code/domain-models'

import { toProtoBuffer } from '../../app-web/src/common-code/proto/stateSubmission'

import { StoreError, isStoreError } from '../store/storeError'
import { convertPrismaErrorToStoreError } from './storeError'

export type InsertDraftSubmissionArgsType = {
    stateCode: string
    programID: string
    submissionType: SubmissionType
    submissionDescription: string
}

// By using Prisma's "increment" syntax here, we ensure that we are atomically increasing
// the state number every time we call this function.
async function incrementAndGetStateNumber(
    client: PrismaClient,
    stateCode: string
): Promise<number | StoreError> {
    try {
        const stateNumberResult = await client.state.update({
            data: {
                latestStateSubmissionNumber: {
                    increment: 1,
                },
            },
            where: {
                stateCode: stateCode,
            },
        })

        return stateNumberResult.latestStateSubmissionNumber
    } catch (e) {
        return convertPrismaErrorToStoreError(e)
    }
}

export async function insertDraftSubmission(
    client: PrismaClient,
    args: InsertDraftSubmissionArgsType
): Promise<DraftSubmissionType | StoreError> {
    const stateNumberResult = await incrementAndGetStateNumber(
        client,
        args.stateCode
    )

    if (isStoreError(stateNumberResult)) {
        console.log('Error: Getting New State Number', stateNumberResult)
        return stateNumberResult
    }

    const stateNumber: number = stateNumberResult

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
        contractDocuments: [],
        rateDocuments: [],
        stateContacts: [],
        actuaryContacts: [],
        managedCareEntities: [],
        federalAuthorities: [],
    }

    const protobuf = toProtoBuffer(draft)

    const buffer = Buffer.from(protobuf)

    try {
        await client.stateSubmission.create({
            data: {
                id: draft.id,
                stateCode: draft.stateCode,
                submissionFormProto: buffer,
            },
        })
    } catch (e: unknown) {
        console.log('ERROR: inserting into to the database: ', e)

        return convertPrismaErrorToStoreError(e)
    }

    return draft
}
