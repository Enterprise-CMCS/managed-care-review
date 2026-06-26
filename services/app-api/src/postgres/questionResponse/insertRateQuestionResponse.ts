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
import { updateRelatedContractsLastActionDateByRateID } from '../updateLastActionDateHelpers'
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
        useRowLock: false,
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

            const latestResponse = result.responses[0]
            if (!latestResponse) {
                return new Error(
                    `Question response was not created for rate question with the ID: ${response.questionID}`
                )
            }

            // The response row and freshness writes must commit together. If
            // any freshness write fails, rollback the response so history and
            // lastActionDate cannot drift.
            await tx.rateTable.update({
                where: {
                    id: result.rateID,
                },
                data: {
                    lastActionDate: latestResponse.createdAt,
                },
            })
            await updateRelatedContractsLastActionDateByRateID(
                tx,
                result.rateID,
                latestResponse.createdAt
            )

            return rateQuestionPrismaToDomainType(result)
        },
    })
}
