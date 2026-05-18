import type {
    InsertQuestionResponseArgs,
    RateQuestionType,
    StateUserType,
} from '../../domain-models'
import {
    isDeleted,
    questionInclude,
    rateQuestionPrismaToDomainType,
} from './questionHelpers'
import { NotFoundError } from '../postgresErrors'
import type { ExtendedPrismaClient } from '../prismaClient'
import { runTransactionWithRowLock } from '../prismaHelpers'

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

    return runTransactionWithRowLock({
        client,
        operationName: 'insertRateQuestionResponse',
        table: 'RateQuestion',
        id: response.questionID,
        transaction: async (tx) => {
            const question = await tx.rateQuestion.findFirst({
                where: {
                    id: response.questionID,
                },
                include: {
                    actions: {
                        orderBy: {
                            createdAt: 'desc',
                        },
                        take: 1,
                    },
                },
            })

            if (!question) {
                return new NotFoundError('Question was not found to respond to')
            }

            if (isDeleted(question)) {
                return new Error(
                    `Cannot create response for question with the ID: ${response.questionID}. Question was deleted.`
                )
            }

            const result = await tx.rateQuestion.update({
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
        },
    })
}
