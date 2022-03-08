import { ForbiddenError, UserInputError } from 'apollo-server-lambda'
import {
    DraftSubmissionType,
    hasValidContract,
    hasValidDocuments, hasValidRates, hasValidSupportingDocumentCategories, isContractAndRates,
    isStateSubmission,
    isStateUser,
    StateSubmissionType
} from '../../app-web/src/common-code/domain-models'
import { Emailer } from '../emailer'
import { MutationResolvers, State } from '../gen/gqlServer'
import { logError, logSuccess } from '../logger'
import { isStoreError, Store } from '../postgres'


export const SubmissionErrorCodes = ['INCOMPLETE', 'INVALID'] as const
type SubmissionErrorCode = typeof SubmissionErrorCodes[number] // iterable union type

type SubmissionError = {
    code: SubmissionErrorCode
    message: string
}

export function isSubmissionError(err: unknown): err is SubmissionError {
    if (err && typeof err == 'object') {
        if ('code' in err && 'message' in err) {
            // This seems ugly but necessary in a type guard.
            const hasCode = err as { code: unknown }
            if (typeof hasCode.code === 'string') {
                if (
                    SubmissionErrorCodes.some(
                        (errCode) => hasCode.code === errCode
                    )
                ) {
                    return true
                }
            }
        }
    }
    return false
}

// This is a state machine transition to turn a draft into a StateSubmission
// It will return an error if there are any missing fields that are required by the state submission
// This strategy (returning a different type from validation) is taken from the
// "parse, don't validate" article: https://lexi-lambda.github.io/blog/2019/11/05/parse-don-t-validate/
function submit(
    draft: DraftSubmissionType
): StateSubmissionType | SubmissionError {
    const maybeStateSubmission: Record<string, unknown> = {
        ...draft,
        status: 'SUBMITTED',
        submittedAt: new Date(),
    }
    if (isStateSubmission(maybeStateSubmission)) return maybeStateSubmission
    
    else if (!hasValidContract(maybeStateSubmission as StateSubmissionType)) {
        return {
            code: 'INCOMPLETE',
            message: 'submissions is missing required contract fields',
        }
    } else if (!hasValidRates(maybeStateSubmission as StateSubmissionType)) {
        return isContractAndRates(draft)
            ? {
                  code: 'INCOMPLETE',
                  message: 'submission is missing required rate fields',
              }
            : {
                  code: 'INVALID',
                  message: 'submission includes invalid rate fields',
              }
    } else if (
        !hasValidDocuments(maybeStateSubmission as StateSubmissionType)
    ) {
        return {
            code: 'INCOMPLETE',
            message: 'submissions must have valid documents',
        }
    } else if (
        !hasValidSupportingDocumentCategories(
            maybeStateSubmission as StateSubmissionType
        )
    ) {
        return {
            code: 'INCOMPLETE',
            message: 'submissions must have valid categories for supporting documents',
        }
    }
    else
        return {
            code: 'INCOMPLETE',
            message: 'submission is missing a required field',
        }
}

// submitDraftSubmissionResolver is a state machine transition for Submission,
// transforming it from a DraftSubmission to a StateSubmission
export function submitDraftSubmissionResolver(
    store: Store,
    emailer: Emailer
): MutationResolvers['submitDraftSubmission'] {
    return async (_parent, { input }, context) => {
        const { user, span } = context
        // This resolver is only callable by state users
        if (!isStateUser(user)) {
            logError(
                'submitDraftSubmission',
                'user not authorized to fetch state data'
            )
            span?.setAttribute('submitDraftSubmissionsError', 'user not authorized to fetch state data')
            span?.addEvent('submitDraftSubmissions unauthorized user')
            throw new ForbiddenError('user not authorized to fetch state data')
        }

        // fetch from the store
        const result = await store.findDraftSubmission(input.submissionID)

        if (isStoreError(result)) {
            const errMessage = `Issue finding a draft submission of type ${result.code}. Message: ${result.message}`
            logError('submitDraftSubmission', errMessage)
            span?.setAttribute('submitDraftSubmissionsError', errMessage)
            span?.addEvent(`submitDraftSubmissions ${errMessage}`)
            throw new Error(errMessage)
        }

        if (result === undefined) {
            const errMessage = `A draft must exist to be submitted: ${input.submissionID}`
            logError('submitDraftSubmission', errMessage)
            span?.setAttribute('submitDraftSubmissionsError', errMessage)
            span?.addEvent(`submitDraftSubmissions ${errMessage}`)
            throw new UserInputError(errMessage, {
                argumentName: 'submissionID',
            })
        }

        const draft: DraftSubmissionType = result

        // Authorization
        const stateFromCurrentUser: State['code'] = user.state_code
        if (draft.stateCode !== stateFromCurrentUser) {
            logError(
                'submitDraftSubmission',
                'user not authorized to fetch data from a different state'
            )
            span?.setAttribute('submitDraftSubmissionsError', 'user not authorized to fetch data from a different state')
            span?.addEvent(`submitDraftSubmissions user not authorized to fetch data from a different state`)
            throw new ForbiddenError(
                'user not authorized to fetch data from a different state'
            )
        }

        // attempt to parse into a StateSubmission
        const submissionResult = submit(draft)

        if (isSubmissionError(submissionResult)) {
            logError(
                'submitDraftSubmission',
                'Incomplete submission cannot be submitted'
            )
            span?.setAttribute('submitDraftSubmissionsError', 'Incomplete submission cannot be submitted')
            span?.addEvent(`submitDraftSubmissions Incomplete submission cannot be submitted`)
            throw new UserInputError(
                'Incomplete submission cannot be submitted',
                {
                    message: submissionResult.message,
                }
            )
        }

        const stateSubmission: StateSubmissionType = submissionResult

        // Save the submission!
        const updateResult = await store.updateStateSubmission(stateSubmission, new Date())
        if (isStoreError(updateResult)) {
            const errMessage = `Issue updating a state submission of ty}pe ${updateResult.code}. Message: ${updateResult.message}`
            logError('submitDraftSubmission', errMessage)
            span?.setAttribute('submitDraftSubmissionsError', errMessage)
            span?.addEvent(`submitDraftSubmissions ${errMessage}`)
            throw new Error(errMessage)
        }

        const updatedSubmission: StateSubmissionType = updateResult

        // Send emails!
        const cmsNewPackageEmailResult = await
        emailer.sendCMSNewPackage(stateSubmission)

        const stateNewPackageEmailResult = await emailer.sendStateNewPackage(
            stateSubmission,
            user
        )

        if (cmsNewPackageEmailResult instanceof Error) {
            logError(
                'submitDraftSubmission - CMS email failed',
                cmsNewPackageEmailResult
            )
            span?.setAttribute('submitDraftSubmissionsError', 'CMS email failed')
            span?.addEvent('submitDraftSubmissions CMS email failed')
            throw cmsNewPackageEmailResult
        }

        if (stateNewPackageEmailResult instanceof Error) {
            logError(
                'submitDraftSubmission - state email failed',
                stateNewPackageEmailResult
            )
            span?.setAttribute('submitDraftSubmissionsError', 'state email failed')
            span?.addEvent('submitDraftSubmissions state email failed')
            throw stateNewPackageEmailResult
        }

        logSuccess('submitDraftSubmission')
        span?.setAttribute('submitDraftSubmissionsSuccess', JSON.stringify(updatedSubmission))
        span?.addEvent('submitDraftSubmissions otel success')

        return { submission: updatedSubmission }
    }
}
