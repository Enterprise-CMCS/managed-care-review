// CognitoUserType is our type for representing the information we get
// from Cognito about a given user

type UserType = StateUserType | CMSUserType | AdminUserType

type StateUserType = {
    role: 'STATE_USER'
    email: string
    name: string
    state_code: string
    givenName: string
    familyName: string
}

type CMSUserType = {
    role: 'CMS_USER'
    email: string
    name: string
    givenName: string
    familyName: string
}

type AdminUserType = {
    role: 'ADMIN_USER'
    email: string
    name: string
    givenName: string
    familyName: string
}

export type { CMSUserType, StateUserType, AdminUserType, UserType }
