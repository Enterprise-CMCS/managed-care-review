import { z } from 'zod'
import * as v from "@badrap/valita";

const divisionType = z.union([
    z.literal('DMCO'),
    z.literal('DMCP'),
    z.literal('OACT'),
])
const valitaDivisionType = v.union(
    v.literal('DMCO'),
    v.literal('DMCP'),
    v.literal('OACT'),
)

type DivisionType = z.infer<typeof divisionType>

export { divisionType, valitaDivisionType }
export type { DivisionType }
