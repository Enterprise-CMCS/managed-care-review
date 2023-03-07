import { PrismaClient } from '@prisma/client'
import { CMSUserType, Question } from '../../domain-models'
import { convertPrismaErrorToStoreError, StoreError } from '../storeError'

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
        }))

        return questions
    } catch (e: unknown) {
        return convertPrismaErrorToStoreError(e)
    }
}
