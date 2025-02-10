import { z } from 'zod'
import * as v from "@badrap/valita";

import { divisionType, valitaDivisionType } from './DivisionType'

const stateType = z.object({
    stateCode: z.string(),
    name: z.string(),
    assignedCMSUsers: z.array(
        z.object({
            id: z.string().uuid(),
            role: z.union([
                z.literal('CMS_USER'),
                z.literal('CMS_APPROVER_USER'),
            ]),
            email: z.string(),
            givenName: z.string(),
            familyName: z.string(),
            stateAssignments: z.array(
                z.object({
                    stateCode: z.string(),
                    name: z.string(),
                })
            ),
            divisionAssignment: divisionType.optional(),
        })
    ),
})

const valitaStateType = v.object({
    stateCode: v.string(),
    name: v.string(),
    assignedCMSUsers: v.array(
        v.object({
            id: v.string(), // uuid not supported
            role: v.union(
                v.literal('CMS_USER'),
                v.literal('CMS_APPROVER_USER'),
            ),
            email: v.string(),
            givenName: v.string(),
            familyName: v.string(),
            stateAssignments: v.array(
                v.object({
                    stateCode: v.string(),
                    name: v.string(),
                })
            ),
            divisionAssignment: valitaDivisionType.optional(),
        })
    ),
})

type StateType = z.infer<typeof stateType>

export type { StateType }
export { stateType, valitaStateType }
