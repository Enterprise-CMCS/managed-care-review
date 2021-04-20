import { UserInputError } from 'apollo-server-lambda'

import {
    InsertDraftSubmissionArgsType,
    isStoreError,
    Store,
} from '../store/index'

import { MutationResolvers, State } from '../gen/gqlServer'

// TODO: potential refactor: pull out database interactions into /datasources createDraftSubmission as per apollo server docs
export function createDraftSubmissionResolver(
    store: Store
): MutationResolvers['createDraftSubmission'] {
    return async (_parent, { input }, context) => {
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
            documents: input.documents as InsertDraftSubmissionArgsType['documents']
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
