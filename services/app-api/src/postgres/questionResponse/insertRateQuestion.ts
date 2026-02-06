import type {
    RateQuestionType,
    DivisionType,
    CMSUsersUnionType,
    CreateRateQuestionInputType,
} from '../../domain-models'
import type { ExtendedPrismaClient } from '../prismaClient'
import {
    questionInclude,
    rateQuestionPrismaToDomainType,
} from './questionHelpers'

export async function insertRateQuestion(
    client: ExtendedPrismaClient,
    questionInput: CreateRateQuestionInputType,
    user: CMSUsersUnionType
): Promise<RateQuestionType | Error> {
    const documents = questionInput.documents.map((document) => ({
        name: document.name,
        s3URL: document.s3URL,
        s3BucketName: document.s3BucketName,
        s3Key: document.s3Key,
    }))

    try {
        const result = await client.rateQuestion.create({
            data: {
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
