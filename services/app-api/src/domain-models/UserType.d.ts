import { StateType } from './StateType'
import { DivisionType } from './DivisionType'

type UserType = StateUserType | CMSUserType | AdminUserType | HelpdeskUserType

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
    divisionAssignment?: DivisionType
}

type AdminUserType = {
    id: string
    role: 'ADMIN_USER'
    email: string
    givenName: string
    familyName: string
}

type HelpdeskUserType = {
    id: string
    role: 'HELPDESK_USER'
    email: string
    givenName: string
    familyName: string
}

export type {
    CMSUserType,
    StateUserType,
    AdminUserType,
    HelpdeskUserType,
    UserType,
}
