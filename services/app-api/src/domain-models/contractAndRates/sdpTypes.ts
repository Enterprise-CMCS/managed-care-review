import { z } from 'zod'
import { indexSDPQuestionsPayload } from '../QuestionsType'
import { sdpRevisionSchema, strippedSDPRevisionSchema } from './revisionTypes'
import {
    createSDPSchema,
    sdpChangeTypeSchema,
    sdpFormDataSchema,
    sdpSubmissionTypeSchema,
} from './sdpFormDataTypes'
import { relatedContractSchema } from './relatedSubmissionTypes'

const sdpSchema = z.object({
    id: z.uuid(),
    createdAt: z.date(),
    updatedAt: z.date(),
    stateCode: z.string(),
    mccrsID: z.string().optional(),
    stateNumber: z.number().min(1),
    draftRevision: sdpRevisionSchema.optional(),
    revisions: z.array(sdpRevisionSchema),
    questions: indexSDPQuestionsPayload.optional(),
    relatedContracts: z.array(relatedContractSchema).optional(),
})

const strippedSDPSchema = z.object({
    id: z.uuid(),
    createdAt: z.date(),
    updatedAt: z.date(),
    stateCode: z.string(),
    mccrsID: z.string().optional(),
    stateNumber: z.number().min(1),
    draftRevision: strippedSDPRevisionSchema.optional(),
    latestSubmittedRevision: strippedSDPRevisionSchema.optional(),
    relatedContracts: z.array(relatedContractSchema).optional(),
})

type SDPType = z.infer<typeof sdpSchema>
type StrippedSDPType = z.infer<typeof strippedSDPSchema>
type SDPFormDataType = z.infer<typeof sdpFormDataSchema>
type CreateSDPInputType = z.infer<typeof createSDPSchema>
type SDPSubmissionType = z.infer<typeof sdpSubmissionTypeSchema>
type SDPChangeType = z.infer<typeof sdpChangeTypeSchema>

export {
    sdpSchema,
    strippedSDPSchema,
    sdpFormDataSchema,
    createSDPSchema,
    sdpSubmissionTypeSchema,
    sdpChangeTypeSchema,
}
export type {
    SDPType,
    StrippedSDPType,
    SDPFormDataType,
    CreateSDPInputType,
    SDPSubmissionType,
    SDPChangeType,
}
