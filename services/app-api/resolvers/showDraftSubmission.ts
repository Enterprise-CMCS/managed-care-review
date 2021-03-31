import { ForbiddenError } from 'apollo-server-lambda'

import { isStoreError, Store } from '../store/index'

import statePrograms from '../data/statePrograms.json'
import { QueryResolvers, SubmissionType, State } from '../gen/gqlServer'

import { DraftSubmissionType } from '../../app-web/src/common-code/domain-models'

export function showDraftSubmissionResolver(
    store: Store
): QueryResolvers['showDraftSubmission'] {
    return async (_parent, { input }, context) => {
        const stateFromCurrentUser: State['code'] = context.user.state_code

        // fetch from the store
        const result = await store.findDraftSubmission(input.submissionID)

        console.log('RESULT!', result)
        if (isStoreError(result)) {
            throw new Error('unimplmented error: ${result}')
        }

        if (result === undefined) {
            return {
                draftSubmission: undefined,
            }
        }

        const draft: DraftSubmissionType = result

        // Authorization
        if (draft.stateCode !== stateFromCurrentUser) {
            throw new ForbiddenError(
                'user not authorized to fetch data from a different state'
            )
        }

        // get the program from this programID (this should be its own resolver)
        const program = statePrograms.states
            .find((state) => state.code === stateFromCurrentUser)
            ?.programs.find((program) => program.id == draft.programID)

        if (program === undefined) {
            throw new Error(
                `The program id ${draft.programID} does not exist in state ${stateFromCurrentUser}`
            )
        }

        const padNumber = draft.stateNumber.toString().padStart(4, '0')
        const draftSubmission = {
            id: draft.id,
            createdAt: draft.createdAt,
            submissionDescription: draft.submissionDescription,
            name: `${draft.stateCode}-${program.name}-${padNumber}`,
            submissionType: draft.submissionType as SubmissionType,
            program,
            stateCode: draft.stateCode,
        }
        return {
            draftSubmission,
        }
    }
}
