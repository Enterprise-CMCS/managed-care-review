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

const contractQuestion = commonQuestionSchema.extend({
    contractID: z.string().uuid(),
})

const rateQuestion = commonQuestionSchema.extend({
    rateID: z.string().uuid(),
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
    contractID: z.string().uuid(),
    documents: z.array(document),
})

const createRateQuestionInput = z.object({
    rateID: z.string().uuid(),
    documents: z.array(document),
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

type Document = z.infer<typeof document>

type IndexRateQuestionsPayload = z.infer<typeof indexRateQuestionsPayload>

export type {
    IndexContractQuestionsPayload,
    CreateContractQuestionPayload,
    CreateContractQuestionInput,
    ContractQuestionList,
    ContractQuestionType,
    Document,
    RateQuestionType,
    CreateRateQuestionInputType,
    IndexRateQuestionsPayload,
}

export {
    indexContractQuestionsPayload,
    createContractQuestionInput,
    createContractQuestionPayload,
    contractQuestion,
    document,
    contractQuestionList,
    rateQuestion,
    createRateQuestionInput,
    indexRateQuestionsPayload,
}
