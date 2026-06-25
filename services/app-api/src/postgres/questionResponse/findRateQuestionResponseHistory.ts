import { parseErrorToError } from '@mc-review/helpers'
import { buildQuestionResponseHistory } from '../submissionHistoryHelpers'
import type { QuestionResponseHistory } from '../../domain-models'
import type { ExtendedPrismaClient } from '../prismaClient'
import {
    parseQuestionHistory,
    questionResponseHistoryInclude,
    type RateQuestionHistoryPayload,
} from './questionResponseHistoryHelpers'

export async function findRateQuestionResponseHistory(
    client: ExtendedPrismaClient,
    rateID: string
): Promise<QuestionResponseHistory[] | Error> {
    try {
        // Do not use findAllQuestionsByRate here. That function is shaped for
        // display and filters soft-deleted Q&A, but history needs deleted
        // questions/responses so their delete actions can still be logged.
        const questions: RateQuestionHistoryPayload[] =
            await client.rateQuestion.findMany({
                where: {
                    rateID,
                },
                include: questionResponseHistoryInclude,
                orderBy: {
                    createdAt: 'desc',
                },
            })

        // Map the database rows into the narrow input shape the history builder
        // needs, then return the built rate-scoped history entries. The store
        // return type is the action history, not the intermediate display or
        // builder-input model.
        const questionHistoryInput = parseQuestionHistory(questions)

        return buildQuestionResponseHistory(questionHistoryInput, 'RATE')
    } catch (e) {
        return parseErrorToError(e)
    }
}
