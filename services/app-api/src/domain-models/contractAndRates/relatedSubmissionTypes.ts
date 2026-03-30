import { z } from 'zod'
import {
    consolidatedContractStatusSchema,
    contractReviewStatusSchema,
    statusSchema,
} from './statusType'
import { contractSubmissionTypeSchema } from './contractSubmissionType'

const relatedContractSchema = z.object({
    id: z.uuid(),
    stateCode: z.string(),
    stateNumber: z.number().min(1),
    contractSubmissionType: contractSubmissionTypeSchema,
    status: statusSchema.optional(),
    reviewStatus: contractReviewStatusSchema.optional(),
    consolidatedStatus: consolidatedContractStatusSchema.optional(),
    mccrsID: z.string().optional(),
})

const relatedSDPSchema = z.object({
    id: z.uuid(),
    stateCode: z.string(),
    stateNumber: z.number().min(1),
    mccrsID: z.string().optional(),
})

type RelatedContractType = z.infer<typeof relatedContractSchema>
type RelatedSDPType = z.infer<typeof relatedSDPSchema>

export { relatedContractSchema, relatedSDPSchema }
export type { RelatedContractType, RelatedSDPType }
