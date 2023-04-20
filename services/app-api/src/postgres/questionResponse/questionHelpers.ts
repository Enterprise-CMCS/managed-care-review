import type { IndexQuestionsPayload, Question } from '../../domain-models'

export const convertToIndexQuestionsPayload = (
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
