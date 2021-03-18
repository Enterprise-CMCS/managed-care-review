import { UserResolvers, User as UserType } from '../gen/gqlServer'
import statePrograms from '../data/statePrograms.json'
import { isCognitoUser } from '../../app-web/src/common-code/domain-models'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const userResolver: UserResolvers<any, Partial<UserType>> = {
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
