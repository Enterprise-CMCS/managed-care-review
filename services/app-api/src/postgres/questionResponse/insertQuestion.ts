import type { PrismaClient } from '@prisma/client'
import type {
    CMSUserType,
    Question,
    CreateQuestionInput,
    DivisionType,
} from '../../domain-models'
import type { StoreError } from '../storeError'
import { convertPrismaErrorToStoreError } from '../storeError'
import { v4 as uuidv4 } from 'uuid'
import { questionPrismaToDomainType, questionInclude } from './questionHelpers'

export async function insertQuestion(
    client: PrismaClient,
    questionInput: CreateQuestionInput,
    user: CMSUserType
): Promise<Question | StoreError> {
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
    } catch (e: unknown) {
        return convertPrismaErrorToStoreError(e)
    }
}
