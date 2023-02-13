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
    const questionData = {
        id: uuidv4(),
        pkgID: questionInput.pkgID,
        dateAdded: new Date(),
        addedBy: user,
        documents: questionInput.documents.map((document) => ({
            id: uuidv4(),
            name: document.name,
            s3URL: document.s3URL,
        })),
    }

    try {
        const result = await client.question.create({
            data: {
                id: questionData.id,
                dateAdded: questionData.dateAdded,
                pkg: {
                    connect: {
                        id: questionData.pkgID,
                    },
                },
                addedBy: {
                    connect: {
                        id: questionData.addedBy.id,
                    },
                },
                documents: {
                    create: questionData.documents,
                },
            },
            include: {
                documents: true,
                addedBy: {
                    include: {
                        stateAssignments: true,
                    },
                },
            },
        })

        const createdQuestion: Question = {
            ...result,
            addedBy: result.addedBy as CMSUserType,
        }

        return createdQuestion
    } catch (e: unknown) {
        return convertPrismaErrorToStoreError(e)
    }
}
