import { z } from 'zod'
import {
    contractRevisionSchema,
    rateRevisionSchema,
    eqroContractRevisionSchema,
    ilosContractRevisionSchema,
} from './revisionTypes'
import { updateInfoSchema } from './updateInfoType'

// A rate revision in a contract's package carries its order in that
// submission. Elsewhere a rate revision has no position.
const submittedRateRevisionSchema = rateRevisionSchema.extend({
    ratePosition: z.number().optional(),
})

const contractPackageSubmissionSchema = z.object({
    submitInfo: updateInfoSchema,
    submittedRevisions: z.array(
        z.union([contractRevisionSchema, rateRevisionSchema])
    ),
    contractRevision: contractRevisionSchema,
    rateRevisions: z.array(submittedRateRevisionSchema),
})

const contractUndoUnlockPackageSchema = z.object({
    undoUnlockInfo: updateInfoSchema,
    draftContractRevisionSnapshot: contractRevisionSchema,
})

const eqroContractPackageSubmissionSchema = z.object({
    submitInfo: updateInfoSchema,
    submittedRevisions: z.array(
        z.union([eqroContractRevisionSchema, rateRevisionSchema])
    ),
    contractRevision: eqroContractRevisionSchema,
    rateRevisions: z.array(submittedRateRevisionSchema),
})

const eqroContractUndoUnlockPackageSchema = z.object({
    undoUnlockInfo: updateInfoSchema,
    draftContractRevisionSnapshot: eqroContractRevisionSchema,
})

// ILOS submissions carry linked rates in rateRevisions like a health plan package.
// submittedRevisions uses the generic contract revision schema because a linked
// rate's parent health plan contract shows up here when it resubmits.
const ilosContractPackageSubmissionSchema = z.object({
    submitInfo: updateInfoSchema,
    submittedRevisions: z.array(
        z.union([contractRevisionSchema, rateRevisionSchema])
    ),
    contractRevision: ilosContractRevisionSchema,
    rateRevisions: z.array(submittedRateRevisionSchema),
})

const ilosContractUndoUnlockPackageSchema = z.object({
    undoUnlockInfo: updateInfoSchema,
    draftContractRevisionSnapshot: ilosContractRevisionSchema,
})

const packgeSubmissionCause = z.union([
    z.literal('CONTRACT_SUBMISSION'),
    z.literal('RATE_SUBMISSION'),
    z.literal('RATE_UNLINK'),
    z.literal('RATE_LINK'),
])

const contractPackageSubmissionWithCauseSchema =
    contractPackageSubmissionSchema.extend({
        cause: packgeSubmissionCause,
    })

type ContractPackageSubmissionType = z.infer<
    typeof contractPackageSubmissionSchema
>

type ContractPackageSubmissionWithCauseType = z.infer<
    typeof contractPackageSubmissionWithCauseSchema
>

type ContractUndoUnlockPackageType = z.infer<
    typeof contractUndoUnlockPackageSchema
>

const ratePackageSubmissionSchema = z.object({
    submitInfo: updateInfoSchema,
    submittedRevisions: z.array(
        z.union([contractRevisionSchema, rateRevisionSchema])
    ),
    rateRevision: rateRevisionSchema,
    contractRevisions: z.array(contractRevisionSchema),
})

type RatePackageSubmissionType = z.infer<typeof ratePackageSubmissionSchema>

const rateUndoUnlockPackageSchema = z.object({
    undoUnlockInfo: updateInfoSchema,
    draftRateRevisionSnapshot: rateRevisionSchema,
})

type RateUndoUnlockPackageType = z.infer<typeof rateUndoUnlockPackageSchema>

const ratePackageSubmissionWithCauseSchema = ratePackageSubmissionSchema.extend(
    {
        cause: packgeSubmissionCause,
    }
)

type RatePackageSubmissionWithCauseType = z.infer<
    typeof ratePackageSubmissionWithCauseSchema
>

export {
    contractPackageSubmissionSchema,
    contractPackageSubmissionWithCauseSchema,
    contractUndoUnlockPackageSchema,
    eqroContractUndoUnlockPackageSchema,
    ratePackageSubmissionWithCauseSchema,
    ratePackageSubmissionSchema,
    rateUndoUnlockPackageSchema,
    eqroContractPackageSubmissionSchema,
    ilosContractPackageSubmissionSchema,
    ilosContractUndoUnlockPackageSchema,
}

export type {
    ContractPackageSubmissionType,
    ContractPackageSubmissionWithCauseType,
    ContractUndoUnlockPackageType,
    RatePackageSubmissionType,
    RatePackageSubmissionWithCauseType,
    RateUndoUnlockPackageType,
}
