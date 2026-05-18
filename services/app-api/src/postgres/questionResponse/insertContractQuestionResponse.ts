import type {
    InsertQuestionResponseArgs,
    StateUserType,
    ContractQuestionType,
} from '../../domain-models'
import {
    isDeleted,
    questionInclude,
    contractQuestionPrismaToDomainType,
} from './questionHelpers'
import { NotFoundError } from '../postgresErrors'
import type { ExtendedPrismaClient } from '../prismaClient'
import { runTransactionWithRowLock } from '../prismaHelpers'

export async function insertContractQuestionResponse(
    client: ExtendedPrismaClient,
    response: InsertQuestionResponseArgs,
    user: StateUserType
): Promise<ContractQuestionType | Error> {
    const documents = response.documents.map((document) => ({
        name: document.name,
        s3URL: document.s3URL,
        s3BucketName: document.s3BucketName,
        s3Key: document.s3Key,
    }))

    return runTransactionWithRowLock({
        client,
        operationName: 'insertContractQuestionResponse',
        table: 'ContractQuestion',
        id: response.questionID,
        transaction: async (tx) => {
            const question = await tx.contractQuestion.findFirst({
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

            const result = await tx.contractQuestion.update({
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
        },
    })
}
