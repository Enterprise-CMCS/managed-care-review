import { Resolvers } from '../gen/gqlServer'
import { Store } from '../postgres'
import { submissionName } from '../../app-web/src/common-code/domain-models'

export function draftSubmissionResolver(
    store: Store
): Resolvers['DraftSubmission'] {
    return {
        program(parent) {
            const program = store.findProgram(
                parent.stateCode,
                parent.programIDs
            )

            if (program === undefined) {
                throw new Error(
                    `The program id ${parent.programIDs} does not exist in state ${parent.stateCode}`
                )
            }

            return program
        },

        name(parent) {
            const program = store.findProgram(
                parent.stateCode,
                parent.programIDs
            )

            if (program === undefined) {
                throw new Error(
                    `The program id ${parent.programIDs} does not exist in state ${parent.stateCode}`
                )
            }

            return submissionName(parent)
        },
    }
}
