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

const userRolesSchema = z.enum([
    'STATE_USER',
    'CMS_USER',
    'CMS_APPROVER_USER',
    'ADMIN_USER',
    'HELPDESK_USER',
    'BUSINESSOWNER_USER',
])

const baseUserSchema = z.object({
    id: z.string().uuid(),
    role: userRolesSchema,
    email: z.string(),
    givenName: z.string(),
    familyName: z.string(),
})

const stateUserSchema = baseUserSchema.extend({
    role: z.literal(userRolesSchema.enum.STATE_USER),
    stateCode: z.string(),
})

const cmsUserSchema = baseUserSchema.extend({
    role: z.literal(userRolesSchema.enum.CMS_USER),
    stateAssignments: z.array(stateType.omit({ assignedCMSUsers: true })),
    divisionAssignment: divisionType.optional(),
})

const cmsApproverUserSchema = baseUserSchema.extend({
    role: z.literal(userRolesSchema.enum.CMS_APPROVER_USER),
    stateAssignments: z.array(stateType.omit({ assignedCMSUsers: true })),
    divisionAssignment: divisionType.optional(),
})

const cmsUsersUnionSchema = z.union([cmsUserSchema, cmsApproverUserSchema])

const adminUserSchema = baseUserSchema.extend({
    role: z.literal(userRolesSchema.enum.ADMIN_USER),
})

const helpdeskUserSchema = baseUserSchema.extend({
    role: z.literal(userRolesSchema.enum.HELPDESK_USER),
})

const businessOwnerUserSchema = baseUserSchema.extend({
    role: z.literal(userRolesSchema.enum.BUSINESSOWNER_USER),
})

type StateUserType = z.infer<typeof stateUserSchema>

type AdminUserType = z.infer<typeof adminUserSchema>

type HelpdeskUserType = z.infer<typeof helpdeskUserSchema>

type BusinessOwnerUserType = z.infer<typeof businessOwnerUserSchema>

type CMSUserType = z.infer<typeof cmsUserSchema>

type CMSApproverUserType = z.infer<typeof cmsApproverUserSchema>

type CMSUsersUnionType = z.infer<typeof cmsUsersUnionSchema>

type BaseUserType = z.infer<typeof baseUserSchema>

type UserRoles = z.infer<typeof userRolesSchema>

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
    BaseUserType,
}

export {
    cmsUserSchema,
    stateUserSchema,
    userRolesSchema,
    baseUserSchema,
    cmsUsersUnionSchema,
}
