import { z } from 'zod'
import * as v from "@badrap/valita";
import { contractRevisionSchema, rateRevisionSchema } from './revisionTypes'
import { unlockedContractStatusSchema } from './statusType'
import { pruneDuplicateEmails } from '../../emailer/formatters'
import {
    contractWithoutDraftRatesSchema,
    rateWithoutDraftContractsSchema,
    valitaContractWithoutDraftRatesSchema
} from './baseContractRateTypes'
import {
    submittableContractFormDataSchema,
    submittableRateFormDataSchema,
} from './formDataTypes'

const contractSchema = contractWithoutDraftRatesSchema.extend({
    withdrawnRates: z.array(rateWithoutDraftContractsSchema).optional(),
    draftRates: z.array(rateWithoutDraftContractsSchema).optional(),
})

const valitaContractSchema = valitaContractWithoutDraftRatesSchema.extend({
    withdrawnRates: v.array().optional(),
    // withdrawnRates: v.array(rateWithoutDraftContractsSchema).optional(),
    draftRates: v.array().optional(),
    // draftRates: z.array(rateWithoutDraftContractsSchema).optional(),
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

// submittableContractSchema validates a draft contract as submittable
// this checks that all the formDatas are complete and that rates are
// attached if required.
const submittableContractSchema = contractSchema.extend({
    draftRevision: contractRevisionSchema.extend({
        formData: submittableContractFormDataSchema,
    }),
    draftRates: z.array(
        rateWithoutDraftContractsSchema.extend({
            draftRevision: rateRevisionSchema.extend({
                formData: submittableRateFormDataSchema,
            }),
        })
    ),
})

type ContractType = z.infer<typeof contractSchema>
type UnlockedContractType = z.infer<typeof unlockedContractSchema>
type DraftContractType = z.infer<typeof draftContractSchema>

function contractSubmitters(contract: ContractType): string[] {
    const submitters: string[] = []
    contract.revisions.forEach(
        (revision) =>
            revision.submitInfo?.updatedBy &&
            submitters.push(revision.submitInfo?.updatedBy.email)
    )

    return pruneDuplicateEmails(submitters)
}

export {
    unlockedContractSchema,
    draftContractSchema,
    submittableContractSchema,
    contractSchema,
    contractSubmitters,
    valitaContractSchema
}

export type { ContractType, DraftContractType, UnlockedContractType }
