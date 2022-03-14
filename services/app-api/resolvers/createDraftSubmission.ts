import { ForbiddenError, UserInputError } from 'apollo-server-lambda'
import { isStateUser } from '../../app-web/src/common-code/domain-models'
import { MutationResolvers, State } from '../gen/gqlServer'
import { logError, logSuccess } from '../logger'
import { InsertDraftSubmissionArgsType, isStoreError, Store } from '../postgres'
import { pluralize } from '../../app-web/src/common-code/formatters'
import { setResolverDetails, setErrorAttributes, setSuccessAttributes } from './attributeHelper'

export function createDraftSubmissionResolver(
    store: Store
): MutationResolvers['createDraftSubmission'] {
    return async (_parent, { input }, context) => {
        const { user, span } = context
        setResolverDetails('createDraftSubmission', user, span)

        // This resolver is only callable by state users
        if (!isStateUser(user)) {
            logError(
                'createDraftSubmission',
                'user not authorized to create state data'
            )
            setErrorAttributes('user not authorized to create state data', span)
            throw new ForbiddenError('user not authorized to create state data')
        }

        const stateFromCurrentUser: State['code'] = user.state_code

        const program = store.findPrograms(stateFromCurrentUser, input.programIDs)

        if (program === undefined) {
            const count = input.programIDs.length
            const errMessage = `The program ${pluralize('id', count)} ${input.programIDs.join(', ')} ${pluralize('does', count)} not exist in state ${stateFromCurrentUser}`
            logError('createDraftSubmission', errMessage)
            setErrorAttributes(errMessage, span)
            throw new UserInputError(errMessage, {
                argumentName: 'programIDs',
            })
        }

        const dbDraftSubmission: InsertDraftSubmissionArgsType = {
            stateCode: stateFromCurrentUser,
            programIDs: input.programIDs,
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
            setErrorAttributes(errMessage, span)
            throw new Error(errMessage)
        }

        logSuccess('createDraftSubmission')
        setSuccessAttributes(span)

        return {
            draftSubmission: draftSubResult,
        }
    }
}
