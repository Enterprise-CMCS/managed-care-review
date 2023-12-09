import type { PrismaClient } from '@prisma/client'
import type {
    InsertQuestionResponseArgs,
    StateUserType,
    Question,
} from '../../domain-models'
import { v4 as uuidv4 } from 'uuid'
import { questionInclude, questionPrismaToDomainType } from './questionHelpers'
import { NotFoundError } from '../postgresErrors'

export async function insertQuestionResponse(
    client: PrismaClient,
    response: InsertQuestionResponseArgs,
    user: StateUserType
): Promise<Question | Error> {
    const documents = response.documents.map((document) => ({
        id: uuidv4(),
        name: document.name,
        s3URL: document.s3URL,
    }))

    try {
        const result = await client.question.update({
            where: {
                id: response.questionID,
            },
            data: {
                responses: {
                    create: {
                        id: uuidv4(),
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

        return questionPrismaToDomainType(result)
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
