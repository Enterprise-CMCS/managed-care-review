import { PrismaClient } from '@prisma/client'
import { CMSUserType } from '../../domain-models'
import { convertPrismaErrorToStoreError, StoreError } from '../storeError'
import { Question, CreateQuestionInput } from '../../domain-models'
import { v4 as uuidv4 } from 'uuid'

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
                pkg: {
                    connect: {
                        id: questionInput.pkgID,
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

        const createdQuestion: Question = {
            ...result,
            addedBy: user,
        }

        return createdQuestion
    } catch (e: unknown) {
        return convertPrismaErrorToStoreError(e)
    }
}
