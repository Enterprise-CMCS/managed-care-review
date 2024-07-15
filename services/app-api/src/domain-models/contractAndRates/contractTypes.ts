import { z } from 'zod'
import {
    contractRevisionWithRatesSchema,
    contractRevisionSchema,
} from './revisionTypes'
import { statusSchema } from './statusType'
import { pruneDuplicateEmails } from '../../emailer/formatters'
import { contractPackageSubmissionSchema } from './packageSubmissions'
import {
    contractWithoutDraftRatesSchema,
    rateWithoutDraftContractsSchema,
} from './baseContractRateTypes'

const contractSchema = contractWithoutDraftRatesSchema.extend({
    draftRates: z.array(rateWithoutDraftContractsSchema).optional(),
})

const unlockedContractSchema = z.object({
    id: z.string().uuid(),
    createdAt: z.date(),
    updatedAt: z.date(),
    status: statusSchema,
    stateCode: z.string(),
    mccrsID: z.string().optional(),
    stateNumber: z.number().min(1),
    // If this contract is in a DRAFT or UNLOCKED status, there will be a draftRevision and draftRates
    draftRevision: contractRevisionSchema,
    draftRates: z.array(rateWithoutDraftContractsSchema),
    // All revisions are submitted and in reverse chronological order
    revisions: z.array(contractRevisionWithRatesSchema),

    packageSubmissions: z.array(contractPackageSubmissionSchema),
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
