import type { PrismaClient } from '@prisma/client'
import type {
    ContractQuestionType,
    CreateContractQuestionInput,
    DivisionType,
    CMSUsersUnionType,
} from '../../domain-models'
import {
    contractQuestionPrismaToDomainType,
    questionInclude,
} from './questionHelpers'

export async function insertContractQuestion(
    client: PrismaClient,
    questionInput: CreateContractQuestionInput,
    user: CMSUsersUnionType
): Promise<ContractQuestionType | Error> {
    const documents = questionInput.documents.map((document) => ({
        name: document.name,
        s3URL: document.s3URL,
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

        return contractQuestionPrismaToDomainType(result)
    } catch (e) {
        return e
    }
}
