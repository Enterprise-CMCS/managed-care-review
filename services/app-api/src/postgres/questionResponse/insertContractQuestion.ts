import type {
    ContractQuestionType,
    CreateContractQuestionInput,
    DivisionType,
    CMSUsersUnionType,
} from '../../domain-models'
import type { ExtendedPrismaClient } from '../prismaClient'
import {
    contractQuestionPrismaToDomainType,
    questionInclude,
} from './questionHelpers'
import { parseErrorToError } from '@mc-review/helpers'

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

    try {
        const result = await client.contractQuestion.create({
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
    } catch (e) {
        return parseErrorToError(e)
    }
}
