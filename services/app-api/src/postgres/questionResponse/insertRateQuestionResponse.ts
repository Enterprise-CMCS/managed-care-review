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
import { parseErrorToError } from '@mc-review/helpers'
import { updateRelatedContractsLastActionDateByRateID } from '../updateLastActionDateHelpers'

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
        const question = await client.rateQuestion.findFirst({
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

        const latestResponse = result.responses[0]
        if (!latestResponse) {
            return new Error(
                `Question response was not created for rate question with the ID: ${response.questionID}`
            )
        }

        // Rate Q&A responses change the rate's visible action history. Move the
        // related submitted contracts too because their package includes this
        // rate data.
        await client.rateTable.update({
            where: {
                id: result.rateID,
            },
            data: {
                lastActionDate: latestResponse.createdAt,
            },
        })
        await updateRelatedContractsLastActionDateByRateID(
            client,
            result.rateID,
            latestResponse.createdAt
        )

        return rateQuestionPrismaToDomainType(result)
    } catch (e) {
        const parsedError = parseErrorToError(e)
        // Return a NotFoundError if prisma fails on the primary key constraint
        // An operation failed because it depends on one or more records
        // that were required but not found.
        if ((parsedError as unknown as { code?: string }).code === 'P2025') {
            return new NotFoundError('Question was not found to respond to')
        }
        return parsedError
    }
}
