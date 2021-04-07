import { Resolvers } from '../gen/gqlServer'
import { Store } from '../store'

export function draftSubmissionResolver(
    store: Store
): Resolvers['DraftSubmission'] {
    return {
        program(parent) {
            const program = store.findProgram(
                parent.stateCode,
                parent.programID
            )

            if (program === undefined) {
                throw new Error(
                    `The program id ${parent.programID} does not exist in state ${parent.stateCode}`
                )
            }

            return program
        },

        name(parent) {
            const program = store.findProgram(
                parent.stateCode,
                parent.programID
            )

            if (program === undefined) {
                throw new Error(
                    `The program id ${parent.programID} does not exist in state ${parent.stateCode}`
                )
            }

            const padNumber = parent.stateNumber.toString().padStart(4, '0')
            return `${parent.stateCode}-${program.name}-${padNumber}`
        },
    }
}
