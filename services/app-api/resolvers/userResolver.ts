import { UserResolvers, User as UserType} from '../gen/gqlServer'
import statePrograms from '../data/statePrograms.json'
import { CognitoUserType } from '../../app-web/src/common-code/domain-models'

const isCognitoUser = (maybeUser: unknown): maybeUser is CognitoUserType => {
    if (maybeUser && typeof maybeUser === 'object'){
        if ("state_code" in maybeUser){
            return true
        }
    }
    return false
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const userResolver: UserResolvers<any, Partial<UserType>> = {
    state(parent) {
                 
    if (isCognitoUser(parent)) {
      const userState = parent.state_code
      const state = statePrograms.states.find((st) => st.code === userState)

      if (state === undefined) {
          throw new Error('No state data for users state: ' + userState)
      }
      return state
    }
    throw new Error('help')
  }
}
