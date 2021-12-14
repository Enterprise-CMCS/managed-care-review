import { Resolvers } from '../gen/gqlServer'
import { Store } from '../postgres'
import { submissionName } from '../../app-web/src/common-code/domain-models'
import { pluralize } from './pluralizer'

export function draftSubmissionResolver(
    store: Store
): Resolvers['DraftSubmission'] {
    return {
        program(parent) {
            const count = parent.programIDs.length
            const program = store.findPrograms(
                parent.stateCode,
                parent.programIDs
            )

            if (program === undefined) {
                throw new Error(
                    `The program ${pluralize('id', count)} ${parent.programIDs.join(', ')} ${pluralize('does', count)} not exist in state ${parent.stateCode}`
                )
            }

            return program
        },

        name(parent) {
            const count = parent.programIDs.length
            const program = store.findPrograms(
                parent.stateCode,
                parent.programIDs
            )

            if (program === undefined) {
                throw new Error(
                    `The program ${pluralize('id', count)} ${parent.programIDs.join(', ')} ${pluralize('does', count)} not exist in state ${parent.stateCode}`
                )
            }

            return submissionName(parent)
        },
    }
}
