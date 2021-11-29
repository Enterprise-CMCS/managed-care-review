import { ForbiddenError, UserInputError } from 'apollo-server-lambda'
import {
    DraftSubmissionType,
    hasValidContract,
    hasValidDocuments,
    hasValidRates,
    isContractAndRates,
    isStateSubmission,
    isStateUser,
    StateSubmissionType,
} from '../../app-web/src/common-code/domain-models'
import { Emailer } from '../emailer'
import { MutationResolvers, State } from '../gen/gqlServer'
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
    } else
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
        // This resolver is only callable by state users
        if (!isStateUser(context.user)) {
            console.error({
                message: 'submitDraftSubmission failed',
                operation: 'submitDraftSubmission',
                status: 'FAILURE',
                error: 'user not authorized to fetch state data',
            })
            throw new ForbiddenError('user not authorized to fetch state data')
        }

        // fetch from the store
        const result = await store.findDraftSubmission(input.submissionID)

        if (isStoreError(result)) {
            console.error({
                message: 'submitDraftSubmission failed',
                operation: 'submitDraftSubmission',
                status: 'FAILURE',
                error: result,
            })
            throw new Error(
                `Issue finding a draft submission of type ${result.code}. Message: ${result.message}`
            )
        }

        if (result === undefined) {
            console.error({
                message: 'submitDraftSubmission failed',
                operation: 'submitDraftSubmission',
                status: 'FAILURE',
                error: `A draft must exist to be submitted: ${input.submissionID}`,
            })
            throw new UserInputError(
                `A draft must exist to be submitted: ${input.submissionID}`,
                {
                    argumentName: 'submissionID',
                }
            )
        }

        const draft: DraftSubmissionType = result

        // Authorization
        const stateFromCurrentUser: State['code'] = context.user.state_code
        if (draft.stateCode !== stateFromCurrentUser) {
            console.error({
                message: 'submitDraftSubmission failed',
                operation: 'submitDraftSubmission',
                status: 'FAILURE',
                error: 'user not authorized to fetch data from a different state',
            })
            throw new ForbiddenError(
                'user not authorized to fetch data from a different state'
            )
        }

        // attempt to parse into a StateSubmission
        const submissionResult = submit(draft)

        if (isSubmissionError(submissionResult)) {
            console.error({
                message: 'submitDraftSubmission failed',
                operation: 'submitDraftSubmission',
                status: 'FAILURE',
                error: submissionResult,
            })
            throw new UserInputError(
                'Incomplete submission cannot be submitted',
                {
                    message: submissionResult.message,
                }
            )
        }

        const stateSubmission: StateSubmissionType = submissionResult

        // Save the submission!
        const updateResult = await store.updateStateSubmission(stateSubmission)
        if (isStoreError(updateResult)) {
            console.log(
                `Issue updating a state submission of type ${updateResult.code}. Message: ${updateResult.message}`
            )
            console.error({
                message: 'submitDraftSubmission failed',
                operation: 'submitDraftSubmission',
                status: 'FAILURE',
                error: updateResult,
            })
            throw new Error(
                `Issue updating a state submission of type ${updateResult.code}. Message: ${updateResult.message}`
            )
        }

        const updatedSubmission: StateSubmissionType = updateResult

        // Send the email!
        const emailData = emailer.generateCMSEmail(stateSubmission)
        const emailResult = await emailer.sendEmail(emailData)

        if (emailResult instanceof Error) {
            console.log('ERROR: Failed to send email to CMS:', emailResult)
            console.error({
                message: 'submitDraftSubmission failed',
                operation: 'submitDraftSubmission',
                status: 'FAILURE',
                error: emailResult,
            })
            throw emailResult
        }

        console.info({
            message: 'submitDraftSubmission succeeded',
            operation: 'submitDraftSubmission',
            status: 'SUCCESS',
        })

        return { submission: updatedSubmission }
    }
}
