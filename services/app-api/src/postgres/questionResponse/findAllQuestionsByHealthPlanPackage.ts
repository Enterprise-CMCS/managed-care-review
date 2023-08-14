import type { PrismaClient } from '@prisma/client'
import type {
    CMSUserType,
    Question,
    QuestionResponseType,
} from '../../domain-models'
import type { StoreError } from '../storeError'
import { convertPrismaErrorToStoreError } from '../storeError'

export async function findAllQuestionsByHealthPlanPackage(
    client: PrismaClient,
    pkgID: string
): Promise<Question[] | StoreError> {
    try {
        const findResult = await client.question.findMany({
            where: {
                pkgID: pkgID,
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
        return convertPrismaErrorToStoreError(e)
    }
}
