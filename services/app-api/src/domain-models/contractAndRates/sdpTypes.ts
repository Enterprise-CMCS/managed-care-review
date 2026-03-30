import { z } from 'zod'
import { indexSDPQuestionsPayload } from '../QuestionsType'
import { sdpRevisionSchema, strippedSDPRevisionSchema } from './revisionTypes'

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
})

type SDPType = z.infer<typeof sdpSchema>
type StrippedSDPType = z.infer<typeof strippedSDPSchema>

export { sdpSchema, strippedSDPSchema }
export type { SDPType, StrippedSDPType }
