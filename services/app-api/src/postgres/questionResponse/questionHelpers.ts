import type {
    CMSUserType,
    IndexQuestionsPayload,
    Question,
    QuestionResponseType,
    RateQuestion,
} from '../../domain-models'
import type { Prisma } from '@prisma/client'

const questionInclude = {
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
} satisfies Prisma.QuestionInclude

type PrismaQuestionType = Prisma.QuestionGetPayload<{
    include: typeof questionInclude
}>

type PrismaRateQuestionType = Prisma.RateQuestionGetPayload<{
    include: typeof questionInclude
}>

// Both types are similar only difference is one related to a contract and the other a rate.
const commonQuestionPrismaToDomainType = <
    T extends PrismaQuestionType | PrismaRateQuestionType,
    U extends Question | RateQuestion,
>(
    prismaQuestion: T
): U =>
    ({
        ...prismaQuestion,
        addedBy: {
            ...prismaQuestion.addedBy,
            stateAssignments: [],
        } as CMSUserType,
        responses: prismaQuestion.responses as QuestionResponseType[],
    }) as unknown as U

const questionPrismaToDomainType = commonQuestionPrismaToDomainType<
    PrismaQuestionType,
    Question
>
const rateQuestionPrismaToDomainType = commonQuestionPrismaToDomainType<
    PrismaRateQuestionType,
    RateQuestion
>

const convertToIndexQuestionsPayload = (
    questions: Question[]
): IndexQuestionsPayload => {
    const questionsPayload: IndexQuestionsPayload = {
        DMCOQuestions: {
            totalCount: 0,
            edges: [],
        },
        DMCPQuestions: {
            totalCount: 0,
            edges: [],
        },
        OACTQuestions: {
            totalCount: 0,
            edges: [],
        },
    }

    questions.forEach((question) => {
        if (question.division === 'DMCP') {
            questionsPayload.DMCPQuestions.edges.push({ node: question })
            questionsPayload.DMCPQuestions.totalCount++
        } else if (question.division === 'OACT') {
            questionsPayload.OACTQuestions.edges.push({ node: question })
            questionsPayload.OACTQuestions.totalCount++
        } else if (question.division === 'DMCO') {
            questionsPayload.DMCOQuestions.edges.push({ node: question })
            questionsPayload.DMCOQuestions.totalCount++
        }
    })

    return questionsPayload
}

export {
    questionInclude,
    questionPrismaToDomainType,
    convertToIndexQuestionsPayload,
    rateQuestionPrismaToDomainType,
}
