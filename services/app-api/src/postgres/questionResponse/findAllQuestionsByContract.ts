import type { PrismaClient } from '@prisma/client'
import type {
    CMSUserType,
    Question,
    QuestionResponseType,
} from '../../domain-models'

export async function findAllQuestionsByContract(
    client: PrismaClient,
    contractID: string
): Promise<Question[] | Error> {
    try {
        const findResult = await client.question.findMany({
            where: {
                contractID: contractID,
            },
            include: {
                documents: {
                    orderBy: {
                        createdAt: 'desc',
                    },
                },
                responses: {
                    include: {
                        addedBy: true,
                        documents: true,
                    },
                    orderBy: {
                        createdAt: 'desc',
                    },
                },
                addedBy: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        })

        const questions: Question[] = findResult.map((question) => ({
            ...question,
            addedBy: {
                ...question.addedBy,
                stateAssignments: [],
            } as CMSUserType,
            responses: question.responses as QuestionResponseType[],
        }))

        return questions
    } catch (e: unknown) {
        if (e instanceof Error) {
            return e
        }
        console.error('Unknown object thrown by Prisma', e)
        return new Error('Unknown object thrown by Prisma')
    }
}
