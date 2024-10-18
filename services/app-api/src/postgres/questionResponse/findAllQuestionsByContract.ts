import type { PrismaClient } from '@prisma/client'
import type { ContractQuestionType } from '../../domain-models'
import {
    contractQuestionPrismaToDomainType,
    questionInclude,
} from './questionHelpers'

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
            contractQuestionPrismaToDomainType(question)
        )
    } catch (e: unknown) {
        if (e instanceof Error) {
            return e
        }
        console.error('Unknown object thrown by Prisma', e)
        return new Error('Unknown object thrown by Prisma')
    }
}
