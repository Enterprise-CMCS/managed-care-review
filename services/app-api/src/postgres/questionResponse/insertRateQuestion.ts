import type {
    RateQuestionType,
    DivisionType,
    CMSUsersUnionType,
    CreateRateQuestionInputType,
} from '../../domain-models'
import type { ExtendedPrismaClient } from '../prismaClient'
import { updateRelatedContractsLastActionDateByRateID } from '../updateLastActionDateHelpers'
import {
    questionInclude,
    rateQuestionPrismaToDomainType,
} from './questionHelpers'
import { parseErrorToError } from '@mc-review/helpers'

export async function insertRateQuestion(
    client: ExtendedPrismaClient,
    questionInput: CreateRateQuestionInputType,
    user: CMSUsersUnionType
): Promise<RateQuestionType | Error> {
    const documents = questionInput.documents.map((document) => ({
        name: document.name,
        s3URL: document.s3URL,
        s3BucketName: document.s3BucketName,
        s3Key: document.s3Key,
    }))

    try {
        const result = await client.rateQuestion.create({
            data: {
                rate: {
                    connect: {
                        id: questionInput.rateID,
                    },
                },
                addedBy: {
                    connect: {
                        id: user.id,
                    },
                },
                documents: {
                    create: documents,
                },
                division: user.divisionAssignment as DivisionType,
            },
            include: questionInclude,
        })

        // Rate Q&A changes the rate-facing action history and is visible from
        // submitted contracts that include this rate, so update both freshness
        // markers from the question's DB-created timestamp.
        await client.rateTable.update({
            where: {
                id: questionInput.rateID,
            },
            data: {
                lastActionDate: result.createdAt,
            },
        })
        await updateRelatedContractsLastActionDateByRateID(
            client,
            questionInput.rateID,
            result.createdAt
        )

        return rateQuestionPrismaToDomainType(result)
    } catch (e) {
        return parseErrorToError(e)
    }
}
