import type { RateQuestionType } from '../../domain-models'
import type { ExtendedPrismaClient } from '../prismaClient'
import {
    convertNonDeletedRateQuestions,
    questionInclude,
} from './questionHelpers'
import { parseErrorToError } from '@mc-review/helpers'

export async function findAllQuestionsByRate(
    client: ExtendedPrismaClient,
    rateID: string
): Promise<RateQuestionType[] | Error> {
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

        return convertNonDeletedRateQuestions(result)
    } catch (e) {
        return parseErrorToError(e)
    }
}
