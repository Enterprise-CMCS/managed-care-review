import { z } from 'zod'
import { cmsUsersUnionSchema } from './UserType'
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
    addedBy: cmsUsersUnionSchema,
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

const rateQuestionEdge = z.object({
    node: rateQuestion,
})

const questionList = z.object({
    totalCount: z.number(),
    edges: z.array(questionEdge),
})

const rateQuestionList = z.object({
    totalCount: z.number(),
    edges: z.array(rateQuestionEdge),
})

const indexQuestionsPayload = z.object({
    DMCOQuestions: questionList,
    DMCPQuestions: questionList,
    OACTQuestions: questionList,
})

const indexRateQuestionsPayload = z.object({
    DMCOQuestions: rateQuestionList,
    DMCPQuestions: rateQuestionList,
    OACTQuestions: rateQuestionList,
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

type CreateRateQuestionInputType = z.infer<typeof createRateQuestionInput>

type QuestionList = z.infer<typeof questionList>

type Document = z.infer<typeof document>

type IndexRateQuestionsPayload = z.infer<typeof indexRateQuestionsPayload>

export type {
    IndexQuestionsPayload,
    CreateQuestionPayload,
    CreateQuestionInput,
    Question,
    Document,
    QuestionList,
    RateQuestionType,
    CreateRateQuestionInputType,
    IndexRateQuestionsPayload,
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
