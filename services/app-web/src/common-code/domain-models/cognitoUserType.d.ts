// CognitoUserType is our type for representing the information we get
// from Cognito about a given user

export type CognitoUserType = CognitoStateUserType | CognitoCMSUserType

export type CognitoStateUserType = {
    role: 'STATE_USER'
    email: string
    name: string
    state_code: string
}

export type CognitoCMSUserType = {
    role: 'CMS_USER'
    email: string
    name: string
}
