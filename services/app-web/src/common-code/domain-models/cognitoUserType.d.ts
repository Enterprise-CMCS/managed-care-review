// CognitoUserType is our type for representing the information we get
// from Cognito about a given user
export type CognitoUserType = {
	role: string
	email: string
	name: string
	state_code: string
}


export const isCognitoUser = (maybeUser: unknown): maybeUser is CognitoUserType => {
    if (maybeUser && typeof maybeUser === 'object'){
        if ("state_code" in maybeUser){
            return true
        }
    }
    return false
}
