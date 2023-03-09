import type { IndexQuestionsPayload, Question } from '../../domain-models'

// Converts our prisma array of questions into object of questions by division.
export const convertToIndexQuestionsPayload = (
    questions: Question[]
): IndexQuestionsPayload => {
    //For now, we are throwing all questions into DMCO
    return {
        DMCOQuestions: {
            totalCount: questions.length,
            edges: questions.map((question) => ({
                node: question,
            })),
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
}
