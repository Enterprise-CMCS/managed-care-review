import { z } from 'zod'
import {
    contractRevisionSchema,
    rateRevisionSchema,
    eqroContractRevisionSchema,
} from './revisionTypes'
import { unlockedContractStatusSchema } from './statusType'
import { pruneDuplicateEmails } from '../../emailer/formatters'
import {
    contractWithoutDraftRatesSchema,
    rateWithoutDraftContractsSchema,
    eqroContractDraftSchema,
} from './baseContractRateTypes'
import {
    submittableContractFormDataSchema,
    submittableEQROContractFormDataSchema,
    submittableRateFormDataSchema,
} from './formDataTypes'

const contractSchema = contractWithoutDraftRatesSchema.extend({
    withdrawnRates: z.lazy(() =>
        z.array(rateWithoutDraftContractsSchema).optional()
    ),
    draftRates: z.lazy(() =>
        z.array(rateWithoutDraftContractsSchema).optional()
    ),
})

const eqroContractSchema = eqroContractDraftSchema.extend({
    withdrawnRates: z.lazy(() =>
        z.array(rateWithoutDraftContractsSchema).optional()
    ),
    draftRates: z.lazy(() =>
        z.array(rateWithoutDraftContractsSchema).optional()
    ),
})

const unlockedContractSchema = contractSchema.extend({
    status: unlockedContractStatusSchema,
    // Since this is a contract in UNLOCKED status, there will be a draftRevision and draftRates
    draftRevision: z.lazy(() => contractRevisionSchema),
    draftRates: z.lazy(() => z.array(rateWithoutDraftContractsSchema)),
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

const submittableEQROContractSchema = eqroContractSchema.extend({
    draftRevision: eqroContractRevisionSchema.extend({
        formData: submittableEQROContractFormDataSchema,
    }),
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
    submittableEQROContractSchema,
    contractSubmitters,
}

export type { ContractType, DraftContractType, UnlockedContractType }
