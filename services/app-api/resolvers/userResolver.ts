import { Resolvers} from '../gen/gqlServer'
import statePrograms from '../data/statePrograms.json'
import { isCognitoUser } from '../../app-web/src/common-code/domain-models'

export const userResolver: Resolvers["User"] = {
    state(parent) {
        if (isCognitoUser(parent)) {
            const userState = parent.state_code
            const state = statePrograms.states.find(
                (st) => st.code === userState
            )

            if (state === undefined) {
                return {
                    name: 'This state is not part of the pilot',
                    code: userState,
                    programs: [],
                }
            }
            return state
        }
        throw new Error('500: parent of a state resolver isnt a cognito user')
    },
}
