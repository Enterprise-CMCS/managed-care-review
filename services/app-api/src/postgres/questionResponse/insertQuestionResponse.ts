import type { PrismaClient } from '@prisma/client'
import type {
    InsertQuestionResponseArgs,
    QuestionResponseType,
    StateUserType,
} from '../../domain-models'
import { v4 as uuidv4 } from 'uuid'
import { NotFoundError } from '../postgresErrors'

export async function insertQuestionResponse(
    client: PrismaClient,
    response: InsertQuestionResponseArgs,
    user: StateUserType
): Promise<QuestionResponseType | Error> {
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
