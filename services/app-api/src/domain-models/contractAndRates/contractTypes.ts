import { z } from 'zod'
import { contractRevisionSchema } from './revisionTypes'
import { unlockedContractStatusSchema } from './statusType'
import { pruneDuplicateEmails } from '../../emailer/formatters'
import {
    contractWithoutDraftRatesSchema,
    rateWithoutDraftContractsSchema,
} from './baseContractRateTypes'

const contractSchema = contractWithoutDraftRatesSchema.extend({
    draftRates: z.array(rateWithoutDraftContractsSchema).optional(),
})

const unlockedContractSchema = contractSchema.extend({
    status: unlockedContractStatusSchema,
    // Since this is a contract in UNLOCKED status, there will be a draftRevision and draftRates
    draftRevision: contractRevisionSchema,
    draftRates: z.array(rateWithoutDraftContractsSchema),
})

const draftContractSchema = contractSchema.extend({
    status: z.literal('DRAFT'),
    draftRevision: contractRevisionSchema,
    revisions: z.array(contractRevisionSchema).min(1),
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
    unlockedContractSchema,
    draftContractSchema,
    contractSchema,
    contractSubmitters,
}

export type { ContractType, DraftContractType, UnlockedContractType }
