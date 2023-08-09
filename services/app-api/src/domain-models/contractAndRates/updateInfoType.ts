import { z } from 'zod'
import { contractSchema } from './contractTypes'

const updateInfoSchema = z.object({
    updatedAt: z.date(),
    updatedBy: z.string().email(),
    updatedReason: z.string(),
})

type UpdateInfoType = z.infer<typeof updateInfoSchema>
type ContractStatusType = z.infer<typeof contractSchema.shape.status>

export type { ContractStatusType, UpdateInfoType }

export { updateInfoSchema }
