import type { PrismaClient } from '@prisma/client'
import type {
    InsertQuestionResponseArgs,
    StateUserType,
    ContractQuestionType,
} from '../../domain-models'
import {
    questionInclude,
    contractQuestionPrismaToDomainType,
} from './questionHelpers'
import { NotFoundError } from '../postgresErrors'

export async function insertContractQuestionResponse(
    client: PrismaClient,
    response: InsertQuestionResponseArgs,
    user: StateUserType
): Promise<ContractQuestionType | Error> {
    const documents = response.documents.map((document) => ({
        name: document.name,
        s3URL: document.s3URL,
    }))

    try {
        const result = await client.contractQuestion.update({
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

        return contractQuestionPrismaToDomainType(result)
    } catch (e) {
        // Return a NotFoundError if prisma fails on the primary key constraint
        // An operation failed because it depends on one or more records
        // that were required but not found.
        if (e.code === 'P2025') {
            return new NotFoundError('Question was not found to respond to')
        }
        return e
    }
}
