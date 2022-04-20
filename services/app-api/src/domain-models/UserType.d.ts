// CognitoUserType is our type for representing the information we get
// from Cognito about a given user

type UserType = StateUserType | CMSUserType

type StateUserType = {
    role: 'STATE_USER'
    email: string
    name: string
    state_code: string
}

type CMSUserType = {
    role: 'CMS_USER'
    email: string
    name: string
}

export type { CMSUserType, StateUserType, UserType }
