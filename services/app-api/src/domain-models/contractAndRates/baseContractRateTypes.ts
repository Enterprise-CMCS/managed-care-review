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
    // If this contract is in a DRAFT or UNLOCKED status, there will be a draftRevision and draftRates
    draftRevision: contractRevisionSchema.optional(),

    // All revisions are submitted and in reverse chronological order
    revisions: z.array(contractRevisionWithRatesSchema),

    packageSubmissions: z.array(contractPackageSubmissionSchema),
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

export { contractWithoutDraftRatesSchema, rateWithoutDraftContractsSchema }

export type { ContractWithoutDraftRatesType, RateWithoutDraftContractsType }
