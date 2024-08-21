import type { PrismaClient } from '@prisma/client'
import type {
    Question,
    CreateQuestionInput,
    DivisionType,
    CMSUsersUnionType,
} from '../../domain-models'
import { v4 as uuidv4 } from 'uuid'
import { questionPrismaToDomainType, questionInclude } from './questionHelpers'

export async function insertQuestion(
    client: PrismaClient,
    questionInput: CreateQuestionInput,
    user: CMSUsersUnionType
): Promise<Question | Error> {
    const documents = questionInput.documents.map((document) => ({
        id: uuidv4(),
        name: document.name,
        s3URL: document.s3URL,
    }))

    try {
        const result = await client.question.create({
            data: {
                id: uuidv4(),
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

        return questionPrismaToDomainType(result)
    } catch (e) {
        return e
    }
}
