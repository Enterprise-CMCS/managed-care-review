import { z } from 'zod'
import { updateInfoSchema } from './updateInfoType'
import {
    contractFormDataSchema,
    eqroContractFormDataSchema,
    rateFormDataSchema,
    strippedRateFormDataSchema,
    strippedContractFormDataSchema,
} from './formDataTypes'
import { contractSubmissionTypeSchema } from './contractSubmissionType'
import { sdpFormDataSchema } from './sdpFormDataTypes'
import { relatedContractSchema } from './relatedSubmissionTypes'

const sdpRevisionDocumentSchema = z.object({
    id: z.string(),
    name: z.string(),
    s3URL: z.string(),
    sha256: z.string(),
    downloadURL: z.string().optional(),
    dateAdded: z.date().nullable().optional(),
    s3BucketName: z.string().nullable().optional(),
    s3Key: z.string().nullable().optional(),
})

const contractRevisionSchema = z.object({
    id: z.string().uuid(),
    contract: z.object({
        id: z.string().uuid(),
        stateCode: z.string(),
        stateNumber: z.number().min(1),
        contractSubmissionType: contractSubmissionTypeSchema,
    }),
    submitInfo: updateInfoSchema.optional(),
    unlockInfo: updateInfoSchema.optional(),
    createdAt: z.date(),
    updatedAt: z.date(),
    formData: contractFormDataSchema,
})

const eqroContractRevisionSchema = z.object({
    id: z.string().uuid(),
    contract: z.object({
        id: z.string().uuid(),
        stateCode: z.string(),
        stateNumber: z.number().min(1),
        contractSubmissionType: z.literal('EQRO'),
    }),
    submitInfo: updateInfoSchema.optional(),
    unlockInfo: updateInfoSchema.optional(),
    createdAt: z.date(),
    updatedAt: z.date(),
    formData: eqroContractFormDataSchema,
})

const rateRevisionSchema = z.object({
    id: z.string().uuid(),
    rateID: z.string().uuid(),
    submitInfo: updateInfoSchema.optional(),
    unlockInfo: updateInfoSchema.optional(),
    createdAt: z.date(),
    updatedAt: z.date(),
    formData: rateFormDataSchema,
})

const strippedRateRevisionSchema = z.object({
    id: z.uuid(),
    rateID: z.string().uuid(),
    submitInfo: updateInfoSchema.optional(),
    unlockInfo: updateInfoSchema.optional(),
    createdAt: z.date(),
    updatedAt: z.date(),
    formData: strippedRateFormDataSchema,
})

const strippedContractRevisionSchema = z.object({
    id: z.uuid(),
    contract: z.object({
        id: z.uuid(),
        stateCode: z.string(),
        stateNumber: z.number().min(1),
        contractSubmissionType: contractSubmissionTypeSchema,
    }),
    submitInfo: updateInfoSchema.optional(),
    unlockInfo: updateInfoSchema.optional(),
    createdAt: z.date(),
    updatedAt: z.date(),
    formData: strippedContractFormDataSchema,
})

const sdpRevisionSchema = z.object({
    id: z.string().uuid(),
    sdpID: z.string().uuid(),
    sdp: z.object({
        id: z.string().uuid(),
        stateCode: z.string(),
        stateNumber: z.number().min(1),
    }),
    submitInfo: updateInfoSchema.optional(),
    unlockInfo: updateInfoSchema.optional(),
    createdAt: z.date(),
    updatedAt: z.date(),
    formData: sdpFormDataSchema,
    sdpDocuments: z.array(sdpRevisionDocumentSchema).default([]),
    relatedContracts: z.array(relatedContractSchema).default([]),
})

const strippedSDPRevisionSchema = z.object({
    id: z.uuid(),
    sdpID: z.uuid(),
    sdp: z.object({
        id: z.uuid(),
        stateCode: z.string(),
        stateNumber: z.number().min(1),
    }),
    submitInfo: updateInfoSchema.optional(),
    unlockInfo: updateInfoSchema.optional(),
    createdAt: z.date(),
    updatedAt: z.date(),
    formData: sdpFormDataSchema,
    sdpDocuments: z.array(sdpRevisionDocumentSchema).default([]),
    relatedContracts: z.array(relatedContractSchema).default([]),
})

type ContractRevisionType = z.infer<typeof contractRevisionSchema>
type RateRevisionType = z.infer<typeof rateRevisionSchema>
type StrippedRateRevisionType = z.infer<typeof strippedRateRevisionSchema>
type StrippedContractRevisionType = z.infer<
    typeof strippedContractRevisionSchema
>
type SDPRevisionType = z.infer<typeof sdpRevisionSchema>
type StrippedSDPRevisionType = z.infer<typeof strippedSDPRevisionSchema>

export {
    contractRevisionSchema,
    rateRevisionSchema,
    strippedRateRevisionSchema,
    strippedContractRevisionSchema,
    eqroContractRevisionSchema,
    sdpRevisionSchema,
    strippedSDPRevisionSchema,
}

export type {
    ContractRevisionType,
    RateRevisionType,
    StrippedRateRevisionType,
    StrippedContractRevisionType,
    SDPRevisionType,
    StrippedSDPRevisionType,
}
