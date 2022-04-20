// CognitoUserType is our type for representing the information we get
// from Cognito about a given user

type CognitoUserType = CognitoStateUserType | CognitoCMSUserType

type CognitoStateUserType = {
    role: 'STATE_USER'
    email: string
    name: string
    state_code: string
}

type CognitoCMSUserType = {
    role: 'CMS_USER'
    email: string
    name: string
}

export type { CognitoCMSUserType, CognitoStateUserType, CognitoUserType }
