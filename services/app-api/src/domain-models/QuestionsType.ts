import { z } from 'zod'
import { cmsUsersUnionSchema, stateUserSchema } from './UserType'
import { divisionType } from './DivisionType'

const document = z.object({
    id: z.uuid(),
    name: z.string(),
    s3URL: z.string(),
    s3BucketName: z.string().optional(),
    s3Key: z.string().optional(),
    downloadURL: z.string().optional(),
})

// New documents will not have ids yet
const documentInputSchema = document.omit({ id: true })

const questionResponseSchema = z.object({
    id: z.uuid(),
    questionID: z.string().uuid(),
    createdAt: z.date(),
    addedBy: stateUserSchema,
    documents: z.array(document),
})

const commonQuestionSchema = z.object({
    id: z.uuid(),
    createdAt: z.date(),
    addedBy: cmsUsersUnionSchema,
    division: divisionType, // DMCO, DMCP, OACT
    documents: z.array(document),
    responses: z.array(questionResponseSchema),
})

const contractQuestion = commonQuestionSchema.extend({
    contractID: z.uuid(),
})

const rateQuestion = commonQuestionSchema.extend({
    rateID: z.uuid(),
})

const contractQuestionEdge = z.object({
    node: contractQuestion,
})

const rateQuestionEdge = z.object({
    node: rateQuestion,
})

const contractQuestionList = z.object({
    totalCount: z.number(),
    edges: z.array(contractQuestionEdge),
})

const rateQuestionList = z.object({
    totalCount: z.number(),
    edges: z.array(rateQuestionEdge),
})

const indexContractQuestionsPayload = z.object({
    DMCOQuestions: contractQuestionList,
    DMCPQuestions: contractQuestionList,
    OACTQuestions: contractQuestionList,
})

const indexRateQuestionsPayload = z.object({
    DMCOQuestions: rateQuestionList,
    DMCPQuestions: rateQuestionList,
    OACTQuestions: rateQuestionList,
})

const createContractQuestionPayload = z.object({
    question: contractQuestion,
})

const createContractQuestionInput = z.object({
    contractID: z.uuid(),
    documents: z.array(documentInputSchema),
})

const createRateQuestionInput = z.object({
    rateID: z.uuid(),
    documents: z.array(documentInputSchema),
})

const insertQuestionResponseArgs = z.object({
    questionID: z.uuid(),
    documents: z.array(documentInputSchema),
})

type CreateContractQuestionPayload = z.infer<
    typeof createContractQuestionPayload
>

type CreateContractQuestionInput = z.infer<typeof createContractQuestionInput>

type IndexContractQuestionsPayload = z.infer<
    typeof indexContractQuestionsPayload
>

type ContractQuestionType = z.infer<typeof contractQuestion>

type RateQuestionType = z.infer<typeof rateQuestion>

type CreateRateQuestionInputType = z.infer<typeof createRateQuestionInput>

type ContractQuestionList = z.infer<typeof contractQuestionList>

type QuestionAndResponseDocument = z.infer<typeof document>

type CreateDocument = z.infer<typeof documentInputSchema>

type IndexRateQuestionsPayload = z.infer<typeof indexRateQuestionsPayload>

type QuestionResponseType = z.infer<typeof questionResponseSchema>

type InsertQuestionResponseArgs = z.infer<typeof insertQuestionResponseArgs>

export type {
    IndexContractQuestionsPayload,
    CreateContractQuestionPayload,
    CreateContractQuestionInput,
    ContractQuestionList,
    ContractQuestionType,
    QuestionAndResponseDocument,
    CreateDocument,
    RateQuestionType,
    CreateRateQuestionInputType,
    IndexRateQuestionsPayload,
    QuestionResponseType,
    InsertQuestionResponseArgs,
}

export {
    indexContractQuestionsPayload,
    createContractQuestionInput,
    createContractQuestionPayload,
    contractQuestion,
    contractQuestionList,
    rateQuestion,
    createRateQuestionInput,
    indexRateQuestionsPayload,
    insertQuestionResponseArgs,
}
