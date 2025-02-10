import { z } from 'zod'
import * as v from "@badrap/valita";

import { contractRevisionSchema, rateRevisionSchema, valitaContractRevisionSchema, valitaRateRevisionSchema } from './revisionTypes'
import { updateInfoSchema, valitaUpdateInfoSchema } from './updateInfoType'

const contractPackageSubmissionSchema = z.object({
    submitInfo: updateInfoSchema,
    submittedRevisions: z.array(
        z.union([contractRevisionSchema, rateRevisionSchema])
    ),
    contractRevision: contractRevisionSchema,
    rateRevisions: z.array(rateRevisionSchema),
})

const valitaContractPackageSubmissionSchema = v.object({
    submitInfo: valitaUpdateInfoSchema,
    submittedRevisions: v.array(
        v.union(valitaContractRevisionSchema, valitaRateRevisionSchema)
    ),
    contractRevision: valitaContractRevisionSchema,
    rateRevisions: v.array(valitaRateRevisionSchema),
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
    valitaContractPackageSubmissionSchema,
}

export type {
    ContractPackageSubmissionType,
    ContractPackageSubmissionWithCauseType,
    RatePackageSubmissionType,
    RatePackageSubmissionWithCauseType,
}
