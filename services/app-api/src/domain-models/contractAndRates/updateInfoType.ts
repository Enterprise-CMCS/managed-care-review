import { z } from 'zod'
import type { contractSchema } from './contractTypes'
import { baseUserSchema } from '../UserType'

const updateInfoSchema = z.object({
    updatedAt: z.date(),
    updatedBy: baseUserSchema.omit({ id: true }),
    updatedReason: z.string(),
})

type UpdateInfoType = z.infer<typeof updateInfoSchema>
type PackageStatusType = z.infer<typeof contractSchema.shape.status>

export type { PackageStatusType, UpdateInfoType }

export { updateInfoSchema }
