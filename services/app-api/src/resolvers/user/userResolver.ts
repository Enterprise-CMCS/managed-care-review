import type { Resolvers } from '../../gen/gqlServer'
import statePrograms from '../../../../app-web/src/common-code/data/statePrograms.json'

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

export const cmsUserResolver: Resolvers['CMSUser'] = {
    stateAssignments(parent) {
        const userStates = parent.stateAssignments
        const statesWithPrograms = userStates.map((userState) => {
            const state = statePrograms.states.find(
                (st) => st.code === userState.stateCode
            )

            if (state === undefined) {
                return {
                    name: 'This state is not part of the pilot',
                    code: userState.stateCode,
                    programs: [],
                }
            }

            return state
        })

        return statesWithPrograms
    },
}
