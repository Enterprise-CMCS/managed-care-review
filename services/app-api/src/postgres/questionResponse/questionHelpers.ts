import type { IndexQuestionsPayload, Question } from '../../domain-models'
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

const questionPrismaToDomainType = (
    prismaQuestion: PrismaQuestionType
): Question => ({
    ...prismaQuestion,
    addedBy: {
        ...prismaQuestion.addedBy,
        stateAssignments: [],
    } as Question['addedBy'],
    responses: prismaQuestion.responses as Question['responses'],
})

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
}
