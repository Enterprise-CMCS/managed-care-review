import type { PrismaClient } from '@prisma/client'
import type { ContractQuestionType } from '../../domain-models'
import { questionPrismaToDomainType, questionInclude } from './questionHelpers'

export async function findAllQuestionsByContract(
    client: PrismaClient,
    contractID: string
): Promise<ContractQuestionType[] | Error> {
    try {
        const findResult = await client.contractQuestion.findMany({
            where: {
                contractID: contractID,
            },
            include: questionInclude,
            orderBy: {
                createdAt: 'desc',
            },
        })

        return findResult.map((question) =>
            questionPrismaToDomainType(question)
        )
    } catch (e: unknown) {
        if (e instanceof Error) {
            return e
        }
        console.error('Unknown object thrown by Prisma', e)
        return new Error('Unknown object thrown by Prisma')
    }
}
