import { Resolvers } from '../gen/gqlServer'
import statePrograms from '../../../app-web/src/common-code/data/statePrograms.json'

export const stateUserResolver: Resolvers['StateUser'] = {
    state(parent) {
        const userState = parent.stateCode
        const state = statePrograms.states.find((st) => st.code === userState)

        if (state === undefined) {
            return {
                name: 'This state is not part of the pilot',
                code: userState,
                programs: [],
            }
        }
        return state
    },
}
