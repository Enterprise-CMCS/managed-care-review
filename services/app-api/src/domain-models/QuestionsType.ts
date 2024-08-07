import { z } from 'zod'
import { cmsUserType } from './UserType'
import { questionResponseType } from './QuestionResponseType'
import { divisionType } from './DivisionType'

const document = z.object({
    name: z.string(),
    s3URL: z.string(),
    downloadURL: z.string().optional(),
})

const question = z.object({
    id: z.string().uuid(),
    contractID: z.string().uuid(),
    createdAt: z.date(),
    addedBy: cmsUserType,
    division: divisionType, // DMCO, DMCP, OACT
    documents: z.array(document),
    responses: z.array(questionResponseType),
})

const questionEdge = z.object({
    node: question,
})

const questionList = z.object({
    totalCount: z.number(),
    edges: z.array(questionEdge),
})

const indexQuestionsPayload = z.object({
    DMCOQuestions: questionList,
    DMCPQuestions: questionList,
    OACTQuestions: questionList,
})

const createQuestionPayload = z.object({
    question: question,
})

const createQuestionInput = z.object({
    contractID: z.string().uuid(),
    documents: z.array(document),
})

type CreateQuestionPayload = z.infer<typeof createQuestionPayload>

type CreateQuestionInput = z.infer<typeof createQuestionInput>

type IndexQuestionsPayload = z.infer<typeof indexQuestionsPayload>

type Question = z.infer<typeof question>

type QuestionList = z.infer<typeof questionList>

type Document = z.infer<typeof document>

export type {
    IndexQuestionsPayload,
    CreateQuestionPayload,
    CreateQuestionInput,
    Question,
    Document,
    QuestionList,
}

export {
    indexQuestionsPayload,
    createQuestionInput,
    createQuestionPayload,
    question,
    document,
    questionList,
}
