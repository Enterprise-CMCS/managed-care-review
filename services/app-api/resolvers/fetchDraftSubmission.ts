import { ApolloError, ForbiddenError } from 'apollo-server-lambda'
import {
    DraftSubmissionType,
    isStateUser,
} from '../../app-web/src/common-code/domain-models'
import { QueryResolvers, State } from '../gen/gqlServer'
import { logError, logSuccess } from '../logger'
import { isStoreError, Store } from '../postgres'
import { setErrorAttributes, setResolverDetails, setSuccessAttributes } from "./attributeHelper";

export function fetchDraftSubmissionResolver(
    store: Store
): QueryResolvers['fetchDraftSubmission'] {
    return async (_parent, { input }, context) => {
        const { user, span } = context
        setResolverDetails('fetchDraftSubmission', user, span)
        // This resolver is only callable by state users
        if (!isStateUser(context.user)) {
            const errMessage = 'user not authorized to fetch state data'
            logError('fetchDraftSubmission', errMessage)
            setErrorAttributes(errMessage, span)
            throw new ForbiddenError(errMessage)
        }

        // fetch from the store
        const result = await store.findDraftSubmission(input.submissionID)

        if (isStoreError(result)) {
            if (result.code === 'WRONG_STATUS') {
                logError(
                    'fetchDraftSubmission',
                    'Submission is not a DraftSubmission'
                )
                setErrorAttributes('Submission is not a DraftSubmission', span)
                throw new ApolloError(
                    `Submission is not a DraftSubmission`,
                    'WRONG_STATUS',
                    {
                        argumentName: 'submissionID',
                    }
                )
            }
            const errMessage = `Issue finding a draft submission of type ${result.code}. Message: ${result.message}`
            logError('fetchDraftSubmission', errMessage)
            setErrorAttributes(errMessage, span)
            throw new Error(errMessage)
        }

        if (result === undefined) {
            return {
                draftSubmission: undefined,
            }
        }

        const draft: DraftSubmissionType = result

        // Authorization
        const stateFromCurrentUser: State['code'] = context.user.state_code
        if (draft.stateCode !== stateFromCurrentUser) {
            logError(
                'fetchDraftSubmission',
                'user not authorized to fetch data from a different state'
            )
            setErrorAttributes('user not authorized to fetch data from a different state', span)
            throw new ForbiddenError(
                'user not authorized to fetch data from a different state'
            )
        }

        logSuccess('fetchDraftSubmission')
        setSuccessAttributes(span)

        return { draftSubmission: draft }
    }
}
