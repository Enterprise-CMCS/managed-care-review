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

const getQuestionRound = (
    allQuestions: Question[],
    currentQuestion: Question
): number | Error => {
    // Filter out other divisions question and sort by created at in ascending order
    const divisionQuestions = allQuestions
        .filter((question) => question.division === currentQuestion.division)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())

    if (divisionQuestions.length === 0) {
        return new Error('Current question not found')
    }

    // Find index of the current question, this is it's round. First, index 0, in the array is round 1
    const questionIndex = divisionQuestions.findIndex(
        (question) => question.id === currentQuestion.id
    )
    if (questionIndex === -1) {
        return new Error('Current question index not found')
    }

    return questionIndex + 1
}

export {
    questionInclude,
    questionPrismaToDomainType,
    convertToIndexQuestionsPayload,
    getQuestionRound,
}
