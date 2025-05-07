import { z } from 'zod'
import {
    contractPackageSubmissionSchema,
    ratePackageSubmissionSchema,
} from './packageSubmissions'
import { contractRevisionSchema, rateRevisionSchema } from './revisionTypes'
import {
    statusSchema,
    contractReviewStatusSchema,
    consolidatedContractStatusSchema,
    rateReviewStatusSchema,
    consolidatedRateStatusSchema,
} from './statusType'
import {
    indexContractQuestionsPayload,
    indexRateQuestionsPayload,
} from '../QuestionsType'
import { contractReviewActionSchema } from './contractReviewActionType'
import { rateReviewActionSchema } from './rateReviewActionType'

// Contract represents the contract specific information in a submission package
// All that data is contained in revisions, each revision represents the data in a single submission
// submissions are kept intact here across time
const contractWithoutDraftRatesSchema = z.object({
    id: z.string().uuid(),
    createdAt: z.date(),
    updatedAt: z.date(),
    status: statusSchema,
    reviewStatus: contractReviewStatusSchema,
    consolidatedStatus: consolidatedContractStatusSchema,
    stateCode: z.string(),
    mccrsID: z.string().optional(),
    stateNumber: z.number().min(1),
    // If this contract is in a DRAFT or UNLOCKED status, there will be a draftRevision
    draftRevision: contractRevisionSchema.optional(),
    reviewStatusActions: z.array(contractReviewActionSchema).optional(),
    // All revisions are submitted and in reverse chronological order
    revisions: z.array(contractRevisionSchema),

    packageSubmissions: z.array(contractPackageSubmissionSchema),

    questions: indexContractQuestionsPayload.optional(),
})

type ContractReviewStatusType = z.infer<
    typeof contractWithoutDraftRatesSchema.shape.reviewStatus
>

type ContractWithoutDraftRatesType = z.infer<
    typeof contractWithoutDraftRatesSchema
>

const rateWithoutDraftContractsSchema = z.object({
    id: z.string().uuid(),
    createdAt: z.date(),
    updatedAt: z.date(),
    status: statusSchema,
    reviewStatus: rateReviewStatusSchema,
    consolidatedStatus: consolidatedRateStatusSchema,
    stateCode: z.string(),
    parentContractID: z.string().uuid(),
    stateNumber: z.number().min(1),
    // If this rate is in a DRAFT or UNLOCKED status, there will be a draftRevision
    draftRevision: rateRevisionSchema.optional(),
    reviewStatusActions: z.array(rateReviewActionSchema).optional(),
    // All revisions are submitted and in reverse chronological order
    revisions: z.array(rateRevisionSchema),

    packageSubmissions: z.array(ratePackageSubmissionSchema),

    questions: indexRateQuestionsPayload.optional(),
})

type RateReviewStatusType = z.infer<
    typeof rateWithoutDraftContractsSchema.shape.reviewStatus
>

type RateWithoutDraftContractsType = z.infer<
    typeof rateWithoutDraftContractsSchema
>

export { contractWithoutDraftRatesSchema, rateWithoutDraftContractsSchema }

export type {
    ContractWithoutDraftRatesType,
    RateWithoutDraftContractsType,
    ContractReviewStatusType,
    RateReviewStatusType,
}
