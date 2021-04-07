import { Resolvers } from '../gen/gqlServer'
import statePrograms from '../data/statePrograms.json'

export const draftSubmissionResolver: Resolvers['DraftSubmission'] = {
    program(parent) {
        const stateFromCurrentUser = parent.stateCode
        const program = statePrograms.states
            .find((state) => state.code === stateFromCurrentUser)
            ?.programs.find((program) => program.id == parent.programID)

        if (program === undefined) {
            throw new Error(
                `The program id ${parent.programID} does not exist in state ${stateFromCurrentUser}`
            )
        }

        return program
    },

    name(parent) {
        const stateFromCurrentUser = parent.stateCode
        const program = statePrograms.states
            .find((state) => state.code === stateFromCurrentUser)
            ?.programs.find((program) => program.id == parent.programID)

        if (program === undefined) {
            throw new Error(
                `The program id ${parent.programID} does not exist in state ${stateFromCurrentUser}`
            )
        }

        const padNumber = parent.stateNumber.toString().padStart(4, '0')
        return `${parent.stateCode}-${program.name}-${padNumber}`
    },
}
