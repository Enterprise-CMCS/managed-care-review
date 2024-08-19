import { z } from 'zod'
import { divisionType } from './DivisionType'

const stateType = z.object({
    stateCode: z.string(),
    name: z.string(),
    users: z.array(
        z.object({
            id: z.string().uuid(),
            role: z.union([
                z.literal('CMS_USER'),
                z.literal('CMS_APPROVER_USER'),
            ]),
            email: z.string(),
            givenName: z.string(),
            familyName: z.string(),
            divisionAssignment: divisionType.optional(),
        })
    ),
})

type StateType = z.infer<typeof stateType>

export type { StateType }
export { stateType }
