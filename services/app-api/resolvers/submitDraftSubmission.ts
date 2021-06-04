import { ForbiddenError, UserInputError } from 'apollo-server-lambda'
import { isStoreError, Store } from '../store/index'
import { MutationResolvers, State } from '../gen/gqlServer'
import {
    DraftSubmissionType,
    StateSubmissionType,
} from '../../app-web/src/common-code/domain-models'

export const SubmissionErrorCodes = ['INCOMPLETE'] as const
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
    // If the documents array is empty, that's an error
    if (draft.documents.length === 0) {
        return {
            code: 'INCOMPLETE',
            message: 'submissions must have documents',
        }
    }

    const stateSubmission: StateSubmissionType = {
        ...draft,
        submittedAt: new Date(),
    }

    return stateSubmission
}

// submitDraftSubmissionResolver is a state machine transition for Submission,
// transforming it from a DraftSubmissinon to a StateSubmission
export function submitDraftSubmissionResolver(
    store: Store
): MutationResolvers['submitDraftSubmission'] {
    return async (_parent, { input }, context) => {
        // fetch from the store
        const result = await store.findDraftSubmission(input.submissionID)

        if (isStoreError(result)) {
            console.log('Error finding a submission', result)
            throw new Error(
                `Issue finding a draft submission of type ${result.code}. Message: ${result.message}`
            )
        }

        if (result === undefined) {
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
            throw new ForbiddenError(
                'user not authorized to fetch data from a different state'
            )
        }

        // attempt to parse into a StateSubmission
        const submissionResult = submit(draft)

        if (isSubmissionError(submissionResult)) {
            console.log('SubmissionResult Error', submissionResult)
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
            throw new Error(
                `Issue updating a state submission of type ${updateResult.code}. Message: ${updateResult.message}`
            )
        }

        const updatedSubmission: StateSubmissionType = updateResult

        return { submission: updatedSubmission }
    }
}
