import { z } from 'zod'

const ZodRateRevision = z.object({
    id: z.string(),
    rateID: z.string(),

    name: z.string(),
    rateCertURL: z.string(),
})

const ZodRateRevisionDraft = ZodRateRevision.partial({
    rateCertURL: true,
})

const ZodContractRevision = z.object({
    id: z.string(),
    contractID: z.string(),

    name: z.string(),
    contractDescription: z.string(),

    rateRevisions: z.optional(z.array(ZodRateRevision))
})

const ZodContractRevisionDraft = ZodContractRevision.merge(z.object({
    rateRevisions: z.optional(z.array(ZodRateRevisionDraft))
})).partial({
    contractDescription: true,
})

type ZodContractRevisionType = z.infer<typeof ZodContractRevision>
type ZodContractRevisionDraftType = z.infer<typeof ZodContractRevisionDraft>
type ZodRateRevisionType = z.infer<typeof ZodRateRevision>

export type {
    ZodContractRevisionType,
    ZodContractRevisionDraftType,
    ZodRateRevisionType,
}

export {
    ZodContractRevision,
    ZodContractRevisionDraft,
    ZodRateRevision,
}
