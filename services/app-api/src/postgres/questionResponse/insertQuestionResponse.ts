import type { PrismaClient } from '@prisma/client'
import type { StoreError } from '../storeError'
import { convertPrismaErrorToStoreError } from '../storeError'
import type {
    InsertQuestionResponseArgs,
    QuestionResponseType,
    StateUserType,
} from '../../domain-models'
import { v4 as uuidv4 } from 'uuid'

export async function insertQuestionResponse(
    client: PrismaClient,
    response: InsertQuestionResponseArgs,
    user: StateUserType
): Promise<QuestionResponseType | StoreError> {
    const documents = response.documents.map((document) => ({
        id: uuidv4(),
        name: document.name,
        s3URL: document.s3URL,
    }))

    try {
        const result = await client.questionResponse.create({
            data: {
                id: uuidv4(),
                question: {
                    connect: {
                        id: response.questionID,
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
            },
            include: {
                documents: true,
            },
        })

        const createdResponse: QuestionResponseType = {
            ...result,
            addedBy: user,
        }

        return createdResponse
    } catch (e: unknown) {
        return convertPrismaErrorToStoreError(e)
    }
}
