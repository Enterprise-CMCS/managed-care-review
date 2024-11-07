import { z } from 'zod'
import {
    contractWithoutDraftRatesSchema,
    rateWithoutDraftContractsSchema,
} from './baseContractRateTypes'
import { rateRevisionSchema } from './revisionTypes'
import { pruneDuplicateEmails } from '../../emailer/formatters'

const rateSchema = rateWithoutDraftContractsSchema.extend({
    draftContracts: z.array(contractWithoutDraftRatesSchema).optional(),
})

type RateType = z.infer<typeof rateSchema>

function rateSubmitters(rate: RateType): string[] {
    const submitters: string[] = []
    rate.revisions.forEach(
        (revision) =>
            revision.submitInfo?.updatedBy &&
            submitters.push(revision.submitInfo?.updatedBy.email)
    )

    return pruneDuplicateEmails(submitters)
}

export { rateRevisionSchema, rateSchema, rateSubmitters }

export type { RateType }
