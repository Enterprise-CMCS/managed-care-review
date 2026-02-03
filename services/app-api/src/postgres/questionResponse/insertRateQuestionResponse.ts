import type {
    InsertQuestionResponseArgs,
    RateQuestionType,
    StateUserType,
} from '../../domain-models'
import {
    questionInclude,
    rateQuestionPrismaToDomainType,
} from './questionHelpers'
import { NotFoundError } from '../postgresErrors'
import type { ExtendedPrismaClient } from '../prismaClient'

export async function insertRateQuestionResponse(
    client: ExtendedPrismaClient,
    response: InsertQuestionResponseArgs,
    user: StateUserType
): Promise<RateQuestionType | Error> {
    const documents = response.documents.map((document) => ({
        name: document.name,
        s3URL: document.s3URL,
        s3BucketName: document.s3BucketName,
        s3Key: document.s3Key,
    }))

    try {
        const result = await client.rateQuestion.update({
            where: {
                id: response.questionID,
            },
            data: {
                responses: {
                    create: {
                        addedBy: {
                            connect: {
                                id: user.id,
                            },
                        },
                        documents: {
                            create: documents,
                        },
                    },
                },
            },
            include: questionInclude,
        })

        return rateQuestionPrismaToDomainType(result)
    } catch (e) {
        // Return a NotFoundError if prisma fails on the primary key constraint
        // An operation failed because it depends on one or more records
        // that were required but not found.
        if (e.code === 'P2025') {
            return new NotFoundError('Question was not found to respond to')
        }
        return e
    }
}
