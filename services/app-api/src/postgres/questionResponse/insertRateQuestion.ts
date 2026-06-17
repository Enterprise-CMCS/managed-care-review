import type {
    RateQuestionType,
    DivisionType,
    CMSUsersUnionType,
    CreateRateQuestionInputType,
} from '../../domain-models'
import type { ExtendedPrismaClient } from '../prismaClient'
import {
    hasOpenQuestionRound,
    OPEN_QUESTION_ROUND_ERROR_MESSAGE,
    questionInclude,
    rateQuestionPrismaToDomainType,
} from './questionHelpers'
import { runTransactionWithRowLock } from '../prismaHelpers'
import { UserInputPostgresError } from '../postgresErrors'

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

    return runTransactionWithRowLock({
        client,
        operationName: 'insertRateQuestion',
        table: 'RateTable',
        id: questionInput.rateID,
        transactionOptions: { timeout: 20000 },
        transaction: async (tx) => {
            const existingQuestions = await tx.rateQuestion.findMany({
                where: { rateID: questionInput.rateID },
                include: questionInclude,
            })

            if (hasOpenQuestionRound(existingQuestions)) {
                return new UserInputPostgresError(
                    OPEN_QUESTION_ROUND_ERROR_MESSAGE
                )
            }

            const result = await tx.rateQuestion.create({
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

            return rateQuestionPrismaToDomainType(result)
        },
    })
}
