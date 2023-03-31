import { StateType } from './StateType'

type UserType = StateUserType | CMSUserType | AdminUserType

type StateUserType = {
    id: string
    role: 'STATE_USER'
    email: string
    stateCode: string
    givenName: string
    familyName: string
}

type CMSUserType = {
    id: string
    role: 'CMS_USER'
    email: string
    givenName: string
    familyName: string
    stateAssignments: StateType[]
    divisionAssignment?: string
}

type AdminUserType = {
    id: string
    role: 'ADMIN_USER'
    email: string
    givenName: string
    familyName: string
}

export type { CMSUserType, StateUserType, AdminUserType, UserType }
