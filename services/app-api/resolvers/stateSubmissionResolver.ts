import { submissionNameWithPrograms } from '../../app-web/src/common-code/domain-models'
import { pluralize } from '../../app-web/src/common-code/formatters'
import { Resolvers } from '../gen/gqlServer'
import { Store } from '../postgres'

export function stateSubmissionResolver(
    store: Store
): Resolvers['StateSubmission'] {
    return {
        name(parent) {
            const count = parent.programIDs.length
            const programs = store.findPrograms(
                parent.stateCode,
                parent.programIDs
            )

            if (programs === undefined) {
                throw new Error(
                    `The program ${pluralize('id', count)} ${parent.programIDs.join(', ')} ${pluralize('does', count)} not exist in state ${parent.stateCode}`
                )
            }

            return submissionNameWithPrograms(parent, programs)
        },
    }
}
