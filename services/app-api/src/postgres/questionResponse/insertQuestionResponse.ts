import type { PrismaClient } from '@prisma/client'
import type { StoreError } from '../storeError'
import { convertPrismaErrorToStoreError } from '../storeError'
import type {
    InsertQuestionResponseArgs,
    StateUserType,
    Question,
} from '../../domain-models'
import { v4 as uuidv4 } from 'uuid'
import { questionInclude, questionPrismaToDomainType } from './questionHelpers'

export async function insertQuestionResponse(
    client: PrismaClient,
    response: InsertQuestionResponseArgs,
    user: StateUserType
): Promise<Question | StoreError> {
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
    } catch (e: unknown) {
        return convertPrismaErrorToStoreError(e)
    }
}
