import { z } from 'zod'

const divisionType = z.union([
    z.literal('DMCO'),
    z.literal('DMCP'),
    z.literal('OACT'),
])

type DivisionType = z.infer<typeof divisionType>

export { divisionType }
export type { DivisionType }
