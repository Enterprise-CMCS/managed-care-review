import { PrismaClient, StateSubmission } from '@prisma/client'

import { isStoreError, StoreError } from '../store/storeError'

import {
    DraftSubmissionType,
    StateSubmissionType,
} from '../../app-web/src/common-code/domain-models'
import { toDomain } from '../../app-web/src/common-code/proto/stateSubmission'
import { convertPrismaErrorToStoreError } from './storeError'

async function findAllSubmissionWrapper(
    client: PrismaClient,
    stateCode: string
): Promise<StateSubmission[] | StoreError> {
    try {
        console.log('QUERINY In PG')
        const result = await client.stateSubmission.findMany({
            where: {
                stateCode: {
                    equals: stateCode,
                },
            },
        })

        console.log('pgresult', result)

        return result
    } catch (e: unknown) {
        console.log('PGERR', e)
        return convertPrismaErrorToStoreError(e)
    }
}

export async function findAllSubmissions(
    client: PrismaClient,
    stateCode: string
): Promise<(DraftSubmissionType | StateSubmissionType)[] | StoreError> {
    const result = await findAllSubmissionWrapper(client, stateCode)

    if (isStoreError(result)) {
        return result
    }

    const drafts: (DraftSubmissionType | StateSubmissionType)[] = []
    const errors: Error[] = []
    result.forEach((dbDraft) => {
        const proto = dbDraft.submissionFormProto

        const decodeResult = toDomain(proto)

        if (decodeResult instanceof Error) {
            console.log(
                `ERROR: decoding protobuf. id: ${dbDraft.id}: ${decodeResult}`
            )
            errors.push(decodeResult)
            return
        }

        drafts.push(decodeResult)
    })

    if (errors.length != 0) {
        console.log(
            'ERROR: findAllSubmissions failed to decode protobufs: ',
            errors.map((e) => e.toString()).join(',')
        )
    }

    // Rather than completely break our index api if we have submissions that are failing to decode,
    // we log an error and return the ones that worked. We could potentially return empty
    // submissions in their place if we wanted to indicate to users that something was wrong.
    return drafts
}
