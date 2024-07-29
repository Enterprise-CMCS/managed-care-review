import { z } from 'zod'
import {
    contractPackageSubmissionSchema,
    ratePackageSubmissionSchema,
} from './packageSubmissions'
import {
    contractRevisionSchema,
    contractRevisionWithRatesSchema,
    rateRevisionSchema,
    rateRevisionWithContractsSchema,
} from './revisionTypes'
import { statusSchema } from './statusType'

const divisionType = z.union([
    z.literal('DMCO'),
    z.literal('DMCP'),
    z.literal('OACT'),
])
const stateType = z.object({
    stateCode: z.string(),
    name: z.string(),
})
const cmsUserType = z.object({
    id: z.string().uuid(),
    role: z.string(),
    email: z.string(),
    givenName: z.string(),
    familyName: z.string(),
    stateAssignments: z.array(stateType),
    divisionAssignment: divisionType.optional()
})
const document = z.object({
    name: z.string(),
    s3URL: z.string(),
    downloadURL: z.string().optional()
})
const stateUserType = z.object({
    id: z.string().uuid(),
    role: z.literal('STATE_USER'),
    email: z.string(),
    stateCode: z.string(),
    givenName: z.string(),
    familyName: z.string(),
})
const questionResponseType = z.object({
    id: z.string().uuid(),
    questionID: z.string().uuid(),
    createdAt: z.date(),
    addedBy: stateUserType,
    documents: z.array(document)
})
const question = z.object({
    id: z.string().uuid(),
    contractID: z.string().uuid(),
    addedBy: cmsUserType,
    division: divisionType, // DMCO, DMCP, OACT
    documents: z.array(document),
    responses: z.array(questionResponseType)
})
const questionEdge = z.object({
    node: question
})
const  questionList = z.object({
    totalCount: z.number().optional(),
    edges: z.array(questionEdge)
})
const questionIndex = z.object({
    DMCOQuestions: questionList,
    DMCPQuestions: questionList,
    OACTQuestions: questionList,
})
// Contract represents the contract specific information in a submission package
// All that data is contained in revisions, each revision represents the data in a single submission
// submissions are kept intact here across time
const contractWithoutDraftRatesSchema = z.object({
    id: z.string().uuid(),
    createdAt: z.date(),
    updatedAt: z.date(),
    status: statusSchema,
    stateCode: z.string(),
    mccrsID: z.string().optional(),
    stateNumber: z.number().min(1),
    // If this contract is in a DRAFT or UNLOCKED status, there will be a draftRevision
    draftRevision: contractRevisionSchema.optional(),

    // All revisions are submitted and in reverse chronological order
    revisions: z.array(contractRevisionWithRatesSchema),

    packageSubmissions: z.array(contractPackageSubmissionSchema),

    questions: questionIndex.optional()
})

type ContractWithoutDraftRatesType = z.infer<
    typeof contractWithoutDraftRatesSchema
>

const rateWithoutDraftContractsSchema = z.object({
    id: z.string().uuid(),
    createdAt: z.date(),
    updatedAt: z.date(),
    status: statusSchema,
    stateCode: z.string(),
    parentContractID: z.string().uuid(),
    stateNumber: z.number().min(1),
    // If this rate is in a DRAFT or UNLOCKED status, there will be a draftRevision
    draftRevision: rateRevisionSchema.optional(),
    // draftContracts: rateDraftContracts,
    // All revisions are submitted and in reverse chronological order
    revisions: z.array(rateRevisionWithContractsSchema),

    packageSubmissions: z.array(ratePackageSubmissionSchema),
})

type RateWithoutDraftContractsType = z.infer<
    typeof rateWithoutDraftContractsSchema
>

type QuestionIndexType = z.infer<
    typeof questionIndex
>

export { contractWithoutDraftRatesSchema, rateWithoutDraftContractsSchema, questionIndex }

export type { ContractWithoutDraftRatesType, RateWithoutDraftContractsType, QuestionIndexType }
