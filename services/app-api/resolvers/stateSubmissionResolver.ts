import { submissionName } from '../../app-web/src/common-code/domain-models'
import { Resolvers } from '../gen/gqlServer'
import { Store } from '../postgres'
import { pluralize } from './pluralizer'

export function stateSubmissionResolver(
    store: Store
): Resolvers['StateSubmission'] {
    return {
        program(parent) {
            const program = store.findProgram(
                parent.stateCode,
                parent.programIDs
            )
            const count = parent.programIDs.length

            if (program === undefined) {
                throw new Error(
                    `The program ${(pluralize('id', count))}  ${parent.programIDs.join(', ')} ${(pluralize('does', count))} not exist in state ${parent.stateCode}`
                )
            }

            return program
        },

        name(parent) {
            const program = store.findProgram(
                parent.stateCode,
                parent.programIDs
            )
            const count = parent.programIDs.length

            if (program === undefined) {
                throw new Error(
                    `The program ${(pluralize('id', count))}  ${parent.programIDs.join(', ')} ${(pluralize('does', count))} not exist in state ${parent.stateCode}`
                )
            }

            return submissionName(parent)
        },
    }
}
