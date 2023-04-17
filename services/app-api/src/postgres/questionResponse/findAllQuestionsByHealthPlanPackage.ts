import { PrismaClient } from '@prisma/client'
import { CMSUserType, Question, StateUserType } from '../../domain-models'
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
            division: (question.division as Question['division']) || undefined,
            responses: question.responses.map((response) => ({
                ...response,
                addedBy: response.addedBy as StateUserType,
            })),
        }))

        return questions
    } catch (e: unknown) {
        return convertPrismaErrorToStoreError(e)
    }
}
