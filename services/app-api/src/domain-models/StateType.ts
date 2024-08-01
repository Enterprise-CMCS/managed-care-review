import { z } from 'zod'
const stateType = z.object({
    stateCode: z.string(),
    name: z.string(),
})

type StateType = z.infer<typeof stateType>

export type { StateType }
export { stateType }
