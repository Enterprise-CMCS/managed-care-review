import { z } from 'zod'
import * as v from "@badrap/valita";

import { cmsUsersUnionSchema, valitaCmsUsersUnionSchema } from './UserType'
import { questionResponseType, valitaQuestionResponseType } from './QuestionResponseType'
import { divisionType, valitaDivisionType } from './DivisionType'

const document = z.object({
    name: z.string(),
    s3URL: z.string(),
    downloadURL: z.string().optional(),
})
const valitaDocument = v.object({
    name: v.string(),
    s3URL: v.string(),
    downloadURL: v.string().optional(),
})

const commonQuestionSchema = z.object({
    id: z.string().uuid(),
    createdAt: z.date(),
    addedBy: cmsUsersUnionSchema,
    division: divisionType, // DMCO, DMCP, OACT
    documents: z.array(document),
    responses: z.array(questionResponseType),
})
const DateType = v.string().chain((s) => {
    const date = new Date(s);
  
    if (isNaN(+date)) {
      return v.err("invalid date");
    }
  
    return v.ok(date);
  });
const valitaCommonQuestionSchema = v.object({
    id: v.string(), // uuid not supported
    createdAt: DateType, // date not supported
    addedBy: valitaCmsUsersUnionSchema,
    division: valitaDivisionType, // DMCO, DMCP, OACT
    documents: v.array(valitaDocument),
    responses: v.array(valitaQuestionResponseType),
})

const contractQuestion = commonQuestionSchema.extend({
    contractID: z.string().uuid(),
})
const valitaContractQuestion = valitaCommonQuestionSchema.extend({
    contractID: v.string(), // uuid not supported
})

const rateQuestion = commonQuestionSchema.extend({
    rateID: z.string().uuid(),
})

const contractQuestionEdge = z.object({
    node: contractQuestion,
})
const valitaContractQuestionEdge = v.object({
    node: valitaContractQuestion,
})

const rateQuestionEdge = z.object({
    node: rateQuestion,
})

const contractQuestionList = z.object({
    totalCount: z.number(),
    edges: z.array(contractQuestionEdge),
})
const valitaContractQuestionList = v.object({
    totalCount: v.number(),
    edges: v.array(valitaContractQuestionEdge),
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

const valitaIndexContractQuestionsPayload = v.object({
    DMCOQuestions: valitaContractQuestionList,
    DMCPQuestions: valitaContractQuestionList,
    OACTQuestions: valitaContractQuestionList,
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
    valitaIndexContractQuestionsPayload,
    createContractQuestionInput,
    createContractQuestionPayload,
    contractQuestion,
    document,
    contractQuestionList,
    rateQuestion,
    createRateQuestionInput,
    indexRateQuestionsPayload,
}
