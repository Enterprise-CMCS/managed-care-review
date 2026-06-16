import { z } from 'zod'
import {
    adminUserSchema,
    cmsUsersUnionSchema,
    stateUserSchema,
} from './UserType'
import { divisionType } from './DivisionType'

const questionActionTypeSchema = z.enum([
    'DELETE',
    'RESTORE',
    'CASCADE_DELETE',
    'CASCADE_RESTORE',
    'ADMIN_CREATE',
])

const questionActionSchema = z.object({
    id: z.uuid(),
    createdAt: z.date(),
    action: questionActionTypeSchema,
    reason: z.string(),
    updatedBy: adminUserSchema,
})

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
    actions: z.array(questionActionSchema),
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

// Admin-recorded response in the resolved shape the store consumes: the resolver
// has decided the author (the admin, or the state user being recorded on behalf
// of) and validated the reason and date.
const adminCreateContractQuestionResponseInput = z.object({
    questionID: z.uuid(),
    addedByUserID: z.uuid(),
    createdByAdminID: z.uuid(),
    reason: z.string(),
    createdAt: z.date().optional(),
    documents: z.array(documentInputSchema),
})

// Admin-authored contract question, in the resolved shape the store consumes:
// the resolver has already decided the author (the admin, or the CMS user being
// asked on behalf of) and the division (the admin's pick, or the CMS user's
// division). Admin responses are recorded separately via the standalone admin
// response mutation.
const adminCreateContractQuestionInput = z.object({
    contractID: z.uuid(),
    division: divisionType,
    addedByUserID: z.uuid(),
    // The admin performing the action — recorded as updatedBy on the audit action.
    createdByAdminID: z.uuid(),
    // Reason captured on the ADMIN_CREATE audit action.
    reason: z.string(),
    // Optional backfill date; when omitted the store lets the column default to now.
    createdAt: z.date().optional(),
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

type AdminCreateContractQuestionInput = z.infer<
    typeof adminCreateContractQuestionInput
>

type AdminCreateContractQuestionResponseInput = z.infer<
    typeof adminCreateContractQuestionResponseInput
>

type QuestionAction = z.infer<typeof questionActionSchema>

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
    AdminCreateContractQuestionInput,
    AdminCreateContractQuestionResponseInput,
    QuestionAction,
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
    adminCreateContractQuestionInput,
    adminCreateContractQuestionResponseInput,
    questionActionSchema,
    questionActionTypeSchema,
}
