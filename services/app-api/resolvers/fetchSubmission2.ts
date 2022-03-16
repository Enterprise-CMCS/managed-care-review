import { ForbiddenError } from 'apollo-server-lambda'
import { isCMSUser, isStateUser, Submission2Type, submissionStatus } from '../../app-web/src/common-code/domain-models'
import { QueryResolvers, State } from '../gen/gqlServer'
import { logError, logSuccess } from '../logger'
import { isStoreError, Store } from '../postgres'
import { setErrorAttributesOnActiveSpan, setResolverDetailsOnActiveSpan, setSuccessAttributesOnActiveSpan } from "./attributeHelper";

export function fetchSubmission2Resolver(
    store: Store
): QueryResolvers['fetchSubmission2'] {
    return async (_parent, { input }, context) => {
        const { user, span } = context
        setResolverDetailsOnActiveSpan('createDraftSubmission', user, span)
        // fetch from the store
        const result = await store.findSubmissionWithRevisions(input.submissionID)

        if (isStoreError(result)) {
            console.log('Error finding a submission', result)
            const errMessage = `Issue finding a draft submission of type ${result.code}. Message: ${result.message}`
            logError('fetchStateSubmission', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new Error(errMessage)
        }

        if (result === undefined) {
            return {
                submission: undefined,
            }
        }

        const submission: Submission2Type = result

        // Authorization CMS users can view, state users can only view if the state matches
        if (isStateUser(context.user)) {
            const stateFromCurrentUser: State['code'] = context.user.state_code
            if (submission.stateCode !== stateFromCurrentUser) {
                logError(
                    'fetchStateSubmission',
                    'user not authorized to fetch data from a different state'
                )
                setErrorAttributesOnActiveSpan('user not authorized to fetch data from a different state', span)
                throw new ForbiddenError(
                    'user not authorized to fetch data from a different state'
                )
            }
        } else if (isCMSUser(context.user)) {
            if (submissionStatus(submission) === 'DRAFT'){
                logError(
                    'fetchStateSubmission',
                    'CMS user not authorized to fetch a draft'
                )
                setErrorAttributesOnActiveSpan('CMS user not authorized to fetch a draft', span)
                throw new ForbiddenError(
                    'CMS user not authorized to fetch a draft'
                )
            }
        } else {
            logError('fetchStateSubmission', 'unknown user type')
            setErrorAttributesOnActiveSpan('unknown user type', span)
            throw new ForbiddenError(`unknown user type`)
        }

        logSuccess('fetchSubmission2')
        setSuccessAttributesOnActiveSpan(span)
        return { submission }
    }
}
