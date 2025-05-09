import { z } from 'zod'
import {
    contractWithoutDraftRatesSchema,
    rateWithoutDraftContractsSchema,
} from './baseContractRateTypes'
import { rateRevisionSchema, strippedRateRevisionSchema } from './revisionTypes'
import { pruneDuplicateEmails } from '../../emailer/formatters'
import {
    consolidatedRateStatusSchema,
    rateReviewStatusSchema,
    statusSchema,
} from './statusType'
import { rateReviewActionSchema } from './rateReviewActionType'

const rateSchema = rateWithoutDraftContractsSchema.extend({
    withdrawnFromContracts: z.lazy(() =>
        z.array(contractWithoutDraftRatesSchema).optional()
    ),
    draftContracts: z.lazy(() =>
        z.array(contractWithoutDraftRatesSchema).optional()
    ),
})

const strippedRateSchema = z.object({
    id: z.string().uuid(),
    createdAt: z.date(),
    updatedAt: z.date(),
    initiallySubmittedAt: z.date().optional(),
    status: statusSchema,
    reviewStatus: rateReviewStatusSchema,
    consolidatedStatus: consolidatedRateStatusSchema,
    stateCode: z.string(),
    parentContractID: z.string().uuid(),
    stateNumber: z.number().min(1),
    // If this rate is in a DRAFT or UNLOCKED status, there will be a draftRevision
    draftRevision: strippedRateRevisionSchema.optional(),
    reviewStatusActions: z.array(rateReviewActionSchema).optional(),
    latestSubmittedRevision: strippedRateRevisionSchema,
})

type RateType = z.infer<typeof rateSchema>

type StrippedRateType = z.infer<typeof strippedRateSchema>

function rateSubmitters(rate: RateType): string[] {
    const submitters: string[] = []
    rate.revisions.forEach(
        (revision) =>
            revision.submitInfo?.updatedBy &&
            submitters.push(revision.submitInfo?.updatedBy.email)
    )

    return pruneDuplicateEmails(submitters)
}

export { rateRevisionSchema, rateSchema, strippedRateSchema, rateSubmitters }

export type { RateType, StrippedRateType }
