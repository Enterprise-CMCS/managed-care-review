import { z } from 'zod'
import {
    contractRevisionSchema,
    rateRevisionSchema,
    eqroContractRevisionSchema,
} from './revisionTypes'
import { updateInfoSchema } from './updateInfoType'

const contractPackageSubmissionSchema = z.object({
    submitInfo: updateInfoSchema,
    submittedRevisions: z.array(
        z.union([contractRevisionSchema, rateRevisionSchema])
    ),
    contractRevision: contractRevisionSchema,
    rateRevisions: z.array(rateRevisionSchema),
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
    rateRevisions: z.array(rateRevisionSchema),
})

const eqroContractUndoUnlockPackageSchema = z.object({
    undoUnlockInfo: updateInfoSchema,
    draftContractRevisionSnapshot: eqroContractRevisionSchema,
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
}

export type {
    ContractPackageSubmissionType,
    ContractPackageSubmissionWithCauseType,
    ContractUndoUnlockPackageType,
    RatePackageSubmissionType,
    RatePackageSubmissionWithCauseType,
    RateUndoUnlockPackageType,
}
