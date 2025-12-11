import { z } from 'zod'
import { contractRevisionSchema, rateRevisionSchema, eqroContractRevisionSchema } from './revisionTypes'
import { updateInfoSchema } from './updateInfoType'

const contractPackageSubmissionSchema = z.object({
    submitInfo: updateInfoSchema,
    submittedRevisions: z.array(
        z.union([contractRevisionSchema, rateRevisionSchema])
    ),
    contractRevision: contractRevisionSchema,
    rateRevisions: z.array(rateRevisionSchema),
})

const eqroContractPackageSubmissionSchema = z.object({
    submitInfo: updateInfoSchema,
    submittedRevisions: z.array(
        z.union([eqroContractRevisionSchema, rateRevisionSchema])
    ),
    contractRevision: eqroContractRevisionSchema,
    rateRevisions: z.array(rateRevisionSchema),
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

const ratePackageSubmissionSchema = z.object({
    submitInfo: updateInfoSchema,
    submittedRevisions: z.array(
        z.union([contractRevisionSchema, rateRevisionSchema])
    ),
    rateRevision: rateRevisionSchema,
    contractRevisions: z.array(contractRevisionSchema),
})

type RatePackageSubmissionType = z.infer<typeof ratePackageSubmissionSchema>

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
    ratePackageSubmissionWithCauseSchema,
    ratePackageSubmissionSchema,
    eqroContractPackageSubmissionSchema
}

export type {
    ContractPackageSubmissionType,
    ContractPackageSubmissionWithCauseType,
    RatePackageSubmissionType,
    RatePackageSubmissionWithCauseType,
}
