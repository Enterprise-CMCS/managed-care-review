import { UserInputError, ForbiddenError } from 'apollo-server-lambda'

import {
    InsertDraftSubmissionArgsType,
    isStoreError,
    Store,
} from '../store/index'

import { isStateUser } from '../../app-web/src/common-code/domain-models'

import { MutationResolvers, State } from '../gen/gqlServer'

export function createDraftSubmissionResolver(
    store: Store
): MutationResolvers['createDraftSubmission'] {
    return async (_parent, { input }, context) => {
        // This resolver is only callable by state users
        if (!isStateUser(context.user)) {
            throw new ForbiddenError('user not authorized to create state data')
        }

        const stateFromCurrentUser: State['code'] = context.user.state_code

        const program = store.findProgram(stateFromCurrentUser, input.programID)

        if (program === undefined) {
            throw new UserInputError(
                `The program id ${input.programID} does not exist in state ${stateFromCurrentUser}`,
                {
                    argumentName: 'programID',
                }
            )
        }

        const dbDraftSubmission: InsertDraftSubmissionArgsType = {
            stateCode: stateFromCurrentUser,
            programID: input.programID,
            submissionDescription: input.submissionDescription,
            submissionType: input.submissionType as InsertDraftSubmissionArgsType['submissionType'],
        }

        try {
            const draftSubResult = await store.insertDraftSubmission(
                dbDraftSubmission
            )
            if (isStoreError(draftSubResult)) {
                throw new Error(
                    `Issue creating a draft submission of type ${draftSubResult.code}. Message: ${draftSubResult.message}`
                )
            }

            return {
                draftSubmission: draftSubResult,
            }
        } catch (createErr) {
            console.log('Error creating a draft submission:', createErr)
            throw new Error(createErr)
        }
    }
}
