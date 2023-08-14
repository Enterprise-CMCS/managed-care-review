import { z } from 'zod'
import {
    actuaryCommunicationTypeSchema,
    actuaryContactSchema,
    rateCapitationTypeSchema,
    rateTypeSchema,
    sharedRateCertDisplay,
    submissionDocumentSchema,
} from '../../../../app-web/src/common-code/proto/healthPlanFormDataProto/zodSchemas'
import { contractRevisionSchema } from './contractTypes'
import { updateInfoSchema } from './updateInfoType'

// The rate form data  is the form filled out by state users submitting rates for review
const rateFormDataSchema = z.object({
    id: z.string().optional(),
    rateType: rateTypeSchema.optional(),
    rateCapitationType: rateCapitationTypeSchema.optional(),
    rateDocuments: z.array(submissionDocumentSchema).optional(),
    supportingDocuments: z.array(submissionDocumentSchema).optional(),
    rateDateStart: z.date().optional(),
    rateDateEnd: z.date().optional(),
    rateDateCertified: z.date().optional(),
    amendmentEffectiveDateStart: z.date().optional(),
    amendmentEffectiveDateEnd: z.date().optional(),
    rateProgramIDs: z.array(z.string()).optional(),
    rateCertificationName: z.string().optional(),
    certifyingActuaryContacts: z.array(actuaryContactSchema).optional(),
    addtlActuaryContacts: z.array(actuaryContactSchema).optional(),
    actuaryCommunicationPreference: actuaryCommunicationTypeSchema.optional(),
    packagesWithSharedRateCerts: z.array(sharedRateCertDisplay).optional(),
})

// A Rate represents all the data associated with a single rate certification over time.
// The rate's revisions field hold the array of rate revisions that show change history of specific rate data
// The first revision (array index 0) is the current revision
const rateRevisionSchema = z.object({
    id: z.string().uuid(),
    submitInfo: updateInfoSchema.optional(),
    unlockInfo: updateInfoSchema.optional(),
    createdAt: z.date(),
    updatedAt: z.date(),
    formData: rateFormDataSchema,
})

const rateRevisionWithContractsSchema = rateRevisionSchema.extend({
    contractRevisions: z.array(contractRevisionSchema),
})

const rateSchema = z.object({
    id: z.string().uuid(),
    status: z.union([z.literal('SUBMITTED'), z.literal('DRAFT')]),
    stateCode: z.string(),
    stateNumber: z.number().min(1),
     // If this rate is in a DRAFT or UNLOCKED status, there will be a draftRevision
     draftRevision: rateRevisionWithContractsSchema.optional(),
     // All revisions are submitted and in reverse chronological order
    revisions: z.array(rateRevisionWithContractsSchema),
})

const draftRateSchema = rateSchema.extend({
    status: z.literal('DRAFT'),
    revisions: z.array(rateRevisionWithContractsSchema).min(1),
})
type RateType = z.infer<typeof rateSchema>
type RateRevisionType = z.infer<typeof rateRevisionSchema>
type RateRevisionWithContractsType = z.infer<
    typeof rateRevisionWithContractsSchema
>
type RateFormDataType = z.infer<typeof rateFormDataSchema>

export {   rateRevisionSchema,
    rateRevisionWithContractsSchema,
    draftRateSchema,
    rateSchema}

export type {
    RateType,
    RateRevisionType,
    RateRevisionWithContractsType,
    RateFormDataType,
}
