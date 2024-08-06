import { z } from 'zod'
import { stateType } from './StateType'
import { divisionType } from './DivisionType'

type UserType =
    | StateUserType
    | CMSUserType
    | AdminUserType
    | HelpdeskUserType
    | BusinessOwnerUserType
    | CMSApproverUserType

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

const cmsApproverUserType = z.object({
    id: z.string().uuid(),
    role: z.literal('CMS_APPROVER_USER'),
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

const userRoles = z.union([
    stateUserType.shape.role,
    cmsUserType.shape.role,
    adminUserType.shape.role,
    helpdeskUserType.shape.role,
    businessOwnerUserType.shape.role,
    cmsApproverUserType.shape.role,
])

type StateUserType = z.infer<typeof stateUserType>

type AdminUserType = z.infer<typeof adminUserType>

type HelpdeskUserType = z.infer<typeof helpdeskUserType>

type BusinessOwnerUserType = z.infer<typeof businessOwnerUserType>

type CMSUserType = z.infer<typeof cmsUserType>

type CMSApproverUserType = z.infer<typeof cmsApproverUserType>

type CMSUsersUnionType = CMSUserType | CMSApproverUserType

type UserRoles = z.infer<typeof userRoles>

export type {
    CMSUserType,
    StateUserType,
    AdminUserType,
    HelpdeskUserType,
    BusinessOwnerUserType,
    CMSApproverUserType,
    UserType,
    UserRoles,
    CMSUsersUnionType,
}

export { cmsUserType, stateUserType, userRoles }
