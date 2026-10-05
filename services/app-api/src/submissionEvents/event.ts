import { z } from 'zod'

const envelope = {
    envelopeVersion: z.literal(1),
    eventId: z.uuid(),
    source: z.literal('stateportal'),
    stage: z.string().min(1),
    occurredAt: z.iso.datetime(),
    submissionId: z.uuid(),
}

/** References only: no form data, reasons, users, document URLs or credentials. */
export const contractSubmissionEventSchema = z
    .object({
        ...envelope,
        eventType: z.enum(['contract.submitted', 'contract.resubmitted']),
        contractId: z.uuid(),
        contractRevisionId: z.uuid(),
        rates: z.array(
            z
                .object({
                    rateId: z.uuid(),
                    rateRevisionId: z.uuid(),
                    // An existing linked rate can be attached without being newly submitted.
                    submittedInThisEvent: z.boolean(),
                })
                .strict()
        ),
    })
    .strict()

// A rate must first have been submitted with a contract. Independent submissions
// are therefore resubmissions, not fresh contract submissions.
export const rateSubmissionEventSchema = z
    .object({
        ...envelope,
        eventType: z.literal('rate.resubmitted'),
        rateId: z.uuid(),
        rateRevisionId: z.uuid(),
        contracts: z.array(
            z
                .object({
                    contractId: z.uuid(),
                    contractRevisionId: z.uuid(),
                })
                .strict()
        ),
    })
    .strict()

export const submissionEventSchema = z.discriminatedUnion('eventType', [
    contractSubmissionEventSchema,
    rateSubmissionEventSchema,
])

export type SubmissionEvent = z.infer<typeof submissionEventSchema>
