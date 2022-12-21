type UserType = StateUserType | CMSUserType | AdminUserType

type StateUserType = {
    role: Role.STATE_USER
    email: string
    state_code: string
    givenName: string
    familyName: string
}

type CMSUserType = {
    role: Role.CMS_USER
    email: string
    givenName: string
    familyName: string
}

type AdminUserType = {
    role: Role.ADMIN_USER
    email: string
    givenName: string
    familyName: string
}

type Role = 'STATE_USER' | 'CMS_USER' | 'ADMIN_USER'

export type { CMSUserType, StateUserType, AdminUserType, UserType }
