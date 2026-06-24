import type {
    ContractQuestionType,
    CreateContractQuestionInput,
    DivisionType,
    CMSUsersUnionType,
} from '../../domain-models'
import type { ExtendedPrismaClient } from '../prismaClient'
import {
    contractQuestionPrismaToDomainType,
    hasOpenQuestionRound,
    OPEN_QUESTION_ROUND_ERROR_MESSAGE,
    questionInclude,
} from './questionHelpers'
import { runTransactionWithRowLock } from '../prismaHelpers'
import { UserInputPostgresError } from '../postgresErrors'

export async function insertContractQuestion(
    client: ExtendedPrismaClient,
    questionInput: CreateContractQuestionInput,
    user: CMSUsersUnionType
): Promise<ContractQuestionType | Error> {
    // Documents should already have s3BucketName and s3Key from resolver validation
    const documents = questionInput.documents.map((document) => ({
        name: document.name,
        s3URL: document.s3URL,
        s3BucketName: document.s3BucketName,
        s3Key: document.s3Key,
    }))

    return runTransactionWithRowLock({
        client,
        operationName: 'insertContractQuestion',
        table: 'ContractTable',
        id: questionInput.contractID,
        transactionOptions: { timeout: 20000 },
        transaction: async (tx) => {
            const existingQuestions = await tx.contractQuestion.findMany({
                where: { contractID: questionInput.contractID },
                include: questionInclude,
            })

            if (hasOpenQuestionRound(existingQuestions)) {
                return new UserInputPostgresError(
                    OPEN_QUESTION_ROUND_ERROR_MESSAGE
                )
            }

            const result = await tx.contractQuestion.create({
                data: {
                    contract: {
                        connect: {
                            id: questionInput.contractID,
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

            // A new contract question is a user-visible action on the contract.
            // Use the DB-created question timestamp so lastActionDate matches the
            // action users see in Q&A history.
            await client.contractTable.update({
                where: {
                    id: questionInput.contractID,
                },
                data: {
                    lastActionDate: result.createdAt,
                },
            })

            return contractQuestionPrismaToDomainType(result)
        },
    })
}
