import {
    CognitoStateUserType,
    CognitoCMSUserType,
    CognitoUserType,
} from './cognitoUserType'

 function isCognitoUser(user: unknown): user is CognitoUserType {
     if (user && typeof user === 'object') {
         if ('role' in user) {
             const roleUser = user as { role: unknown }
             if (typeof roleUser.role === 'string') {
                 if (
                     roleUser.role === 'STATE_USER' ||
                     roleUser.role === 'CMS_USER'
                 ) {
                     return true
                 }
             }
         }
     }

     return false
 }

 function isStateUser(user: CognitoUserType): user is CognitoStateUserType {
     return user.role === 'STATE_USER'
 }

 function isCMSUser(user: CognitoUserType): user is CognitoCMSUserType {
     return user.role === 'CMS_USER'
 }

 export { isCognitoUser, isCMSUser, isStateUser }
