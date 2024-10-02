import { z } from 'zod'
import { cmsUserSchema } from './UserType'
import { questionResponseType } from './QuestionResponseType'
import { divisionType } from './DivisionType'

const document = z.object({
    name: z.string(),
    s3URL: z.string(),
    downloadURL: z.string().optional(),
})

const commonQuestionSchema = z.object({
    id: z.string().uuid(),
    createdAt: z.date(),
    addedBy: cmsUserSchema,
    division: divisionType, // DMCO, DMCP, OACT
    documents: z.array(document),
    responses: z.array(questionResponseType),
})

const question = commonQuestionSchema.extend({
    contractID: z.string().uuid(),
})

const rateQuestion = commonQuestionSchema.extend({
    rateID: z.string().uuid(),
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

const createRateQuestionInput = z.object({
    rateID: z.string().uuid(),
    documents: z.array(document),
})

type CreateQuestionPayload = z.infer<typeof createQuestionPayload>

type CreateQuestionInput = z.infer<typeof createQuestionInput>

type IndexQuestionsPayload = z.infer<typeof indexQuestionsPayload>

type Question = z.infer<typeof question>

type RateQuestionType = z.infer<typeof rateQuestion>

type CreateRateQuestionInput = z.infer<typeof createRateQuestionInput>

type QuestionList = z.infer<typeof questionList>

type Document = z.infer<typeof document>

export type {
    IndexQuestionsPayload,
    CreateQuestionPayload,
    CreateQuestionInput,
    Question,
    Document,
    QuestionList,
    RateQuestionType,
    CreateRateQuestionInput,
}

export {
    indexQuestionsPayload,
    createQuestionInput,
    createQuestionPayload,
    question,
    document,
    questionList,
    rateQuestion,
    createRateQuestionInput,
}
