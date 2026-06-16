import type { ContractQuestionType } from '../../domain-models'
import type { ExtendedPrismaClient } from '../prismaClient'
import { NotFoundError } from '../postgresErrors'
import {
    contractQuestionPrismaToDomainType,
    questionInclude,
} from './questionHelpers'

export async function findContractQuestion(
    client: ExtendedPrismaClient,
    questionID: string
): Promise<ContractQuestionType | Error> {
    const question = await client.contractQuestion.findFirst({
        where: { id: questionID },
        include: questionInclude,
    })

    if (!question) {
        return new NotFoundError('Contract question was not found')
    }

    return contractQuestionPrismaToDomainType(question)
}
