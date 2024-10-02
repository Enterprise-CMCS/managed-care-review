import type { PrismaClient } from '@prisma/client'
import type {
    RateQuestion,
    DivisionType,
    CMSUsersUnionType,
    CreateRateQuestionInput,
} from '../../domain-models'
import { v4 as uuidv4 } from 'uuid'
import {
    questionInclude,
    rateQuestionPrismaToDomainType,
} from './questionHelpers'

export async function insertRateQuestion(
    client: PrismaClient,
    questionInput: CreateRateQuestionInput,
    user: CMSUsersUnionType
): Promise<RateQuestion | Error> {
    const documents = questionInput.documents.map((document) => ({
        id: uuidv4(),
        name: document.name,
        s3URL: document.s3URL,
    }))

    try {
        const result = await client.rateQuestion.create({
            data: {
                id: uuidv4(),
                rate: {
                    connect: {
                        id: questionInput.rateID,
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
                division: user.divisionAssignment as DivisionType,
            },
            include: questionInclude,
        })

        return rateQuestionPrismaToDomainType(result)
    } catch (e) {
        return e
    }
}
