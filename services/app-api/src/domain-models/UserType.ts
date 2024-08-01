import { z } from 'zod'
import { stateType } from './StateType'
import { divisionType } from './DivisionType'

type UserType =
    | StateUserType
    | CMSUserType
    | AdminUserType
    | HelpdeskUserType
    | BusinessOwnerUserType

const stateUserType = z.object({
    id: z.string().uuid(),
    role: z.literal('STATE_USER'),
    email: z.string(),
    stateCode: z.string(),
    givenName: z.string(),
    familyName: z.string(),
})

const cmsUserType = z.object({
    id: z.string().uuid(),
    role: z.literal('CMS_USER'),
    email: z.string(),
    givenName: z.string(),
    familyName: z.string(),
    stateAssignments: z.array(stateType),
    divisionAssignment: divisionType.optional(),
})

const adminUserType = z.object({
    id: z.string().uuid(),
    role: z.literal('ADMIN_USER'),
    email: z.string(),
    givenName: z.string(),
    familyName: z.string(),
})

const helpdeskUserType = z.object({
    id: z.string().uuid(),
    role: z.literal('HELPDESK_USER'),
    email: z.string(),
    givenName: z.string(),
    familyName: z.string(),
})

const businessOwnerUserType = z.object({
    id: z.string().uuid(),
    role: z.literal('BUSINESSOWNER_USER'),
    email: z.string(),
    givenName: z.string(),
    familyName: z.string(),
})

type StateUserType = z.infer<typeof stateUserType>

type AdminUserType = z.infer<typeof adminUserType>

type HelpdeskUserType = z.infer<typeof helpdeskUserType>

type BusinessOwnerUserType = z.infer<typeof businessOwnerUserType>

type CMSUserType = z.infer<typeof cmsUserType>

export type {
    CMSUserType,
    StateUserType,
    AdminUserType,
    HelpdeskUserType,
    BusinessOwnerUserType,
    UserType,
}

export { cmsUserType, stateUserType }
