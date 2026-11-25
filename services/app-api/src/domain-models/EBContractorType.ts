import { z } from 'zod'

export const ebContractorSchema = z.object({
    id: z.string(),
    name: z.string(),
    isDeprecated: z.boolean(),
})

export type EBContractorType = z.infer<typeof ebContractorSchema>
