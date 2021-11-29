import { ForbiddenError, UserInputError } from 'apollo-server-lambda'
import { isStateUser } from '../../app-web/src/common-code/domain-models'
import { MutationResolvers, State } from '../gen/gqlServer'
import { logError, logSuccess } from '../logger'
import { InsertDraftSubmissionArgsType, isStoreError, Store } from '../postgres'

export function createDraftSubmissionResolver(
    store: Store
): MutationResolvers['createDraftSubmission'] {
    return async (_parent, { input }, context) => {
        // This resolver is only callable by state users
        if (!isStateUser(context.user)) {
            logError(
                'createDraftSubmission',
                'user not authorized to create state data'
            )
            throw new ForbiddenError('user not authorized to create state data')
        }

        const stateFromCurrentUser: State['code'] = context.user.state_code

        const program = store.findProgram(stateFromCurrentUser, input.programID)

        if (program === undefined) {
            const errMessage = `The program id ${input.programID} does not exist in state ${stateFromCurrentUser}`
            logError('createDraftSubmission', errMessage)
            throw new UserInputError(errMessage, {
                argumentName: 'programID',
            })
        }

        const dbDraftSubmission: InsertDraftSubmissionArgsType = {
            stateCode: stateFromCurrentUser,
            programID: input.programID,
            submissionDescription: input.submissionDescription,
            submissionType:
                input.submissionType as InsertDraftSubmissionArgsType['submissionType'],
        }

        const draftSubResult = await store.insertDraftSubmission(
            dbDraftSubmission
        )
        if (isStoreError(draftSubResult)) {
            const errMessage = `Issue creating a draft submission of type ${draftSubResult.code}. Message: ${draftSubResult.message}`
            logError('createDraftSubmission', errMessage)
            throw new Error(errMessage)
        }

        logSuccess('createDraftSubmission')

        return {
            draftSubmission: draftSubResult,
        }
    }
}
