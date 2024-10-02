import type { PrismaClient } from '@prisma/client'
import type { RateQuestion } from '../../domain-models'
import {
    questionInclude,
    rateQuestionPrismaToDomainType,
} from './questionHelpers'

export async function findAllQuestionsByRate(
    client: PrismaClient,
    rateID: string
): Promise<RateQuestion[] | Error> {
    try {
        const result = await client.rateQuestion.findMany({
            where: {
                rateID: rateID,
            },
            include: questionInclude,
            orderBy: {
                createdAt: 'desc',
            },
        })

        return result.map((question) =>
            rateQuestionPrismaToDomainType(question)
        )
    } catch (e) {
        return e
    }
}
