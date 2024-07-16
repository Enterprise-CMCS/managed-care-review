import { z } from 'zod'
import { contractRevisionWithRatesSchema } from './revisionTypes'
import { statusSchema } from './statusType'
import { pruneDuplicateEmails } from '../../emailer/formatters'
import { rateSchema } from './rateTypes'
import { contractPackageSubmissionSchema } from './packageSubmissions'

// Contract represents the contract specific information in a submission package
// All that data is contained in revisions, each revision represents the data in a single submission
// submissions are kept intact here across time
const contractSchema = z.object({
    id: z.string().uuid(),
    createdAt: z.date(),
    updatedAt: z.date(),
    status: statusSchema,
    stateCode: z.string(),
    mccrsID: z.string().optional(),
    stateNumber: z.number().min(1),
    // If this contract is in a DRAFT or UNLOCKED status, there will be a draftRevision and draftRates
    draftRevision: contractRevisionWithRatesSchema.optional(),
    draftRates: z.array(rateSchema).optional(),
    // All revisions are submitted and in reverse chronological order
    revisions: z.array(contractRevisionWithRatesSchema),

    packageSubmissions: z.array(contractPackageSubmissionSchema),
})

const unlockedContractSchema = contractSchema.extend({
    status: z.literal('UNLOCKED'),
    // Since this is a contract in UNLOCKED status, there will be a draftRevision and draftRates
    draftRevision: contractRevisionWithRatesSchema,
    draftRates: z.array(rateSchema),
})

const draftContractSchema = contractSchema.extend({
    status: z.literal('DRAFT'),
    draftRevision: contractRevisionWithRatesSchema,
    revisions: z.array(contractRevisionWithRatesSchema).min(1),
})

type ContractType = z.infer<typeof contractSchema>
type UnlockedContractType = z.infer<typeof unlockedContractSchema>
type DraftContractType = z.infer<typeof draftContractSchema>

function contractSubmitters(contract: ContractType): string[] {
    const submitters: string[] = []
    contract.revisions.forEach(
        (revision) =>
            revision.submitInfo?.updatedBy &&
            submitters.push(revision.submitInfo?.updatedBy)
    )

    return pruneDuplicateEmails(submitters)
}

export {
    contractRevisionWithRatesSchema,
    unlockedContractSchema,
    draftContractSchema,
    contractSchema,
    contractSubmitters,
}

export type { ContractType, DraftContractType, UnlockedContractType }
