import type { PrismaClient } from '@prisma/client'
import type { Question } from '../../domain-models'
import { questionPrismaToDomainType, questionInclude } from './questionHelpers'

export async function findAllQuestionsByContract(
    client: PrismaClient,
    contractID: string
): Promise<Question[] | Error> {
    try {
        const findResult = await client.question.findMany({
            where: {
                contractID: contractID,
            },
            include: questionInclude,
            orderBy: {
                createdAt: 'desc',
            },
        })

        const questions: Question[] = findResult.map((question) =>
            questionPrismaToDomainType(question)
        )

        return questions
    } catch (e: unknown) {
        if (e instanceof Error) {
            return e
        }
        console.error('Unknown object thrown by Prisma', e)
        return new Error('Unknown object thrown by Prisma')
    }
}
