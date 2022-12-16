import {
    HealthPlanPackage,
    SubmitHealthPlanPackageMutationFn,
    UnlockHealthPlanPackageMutationFn,
} from '../gen/gqlClient'
import { GraphQLErrors } from '@apollo/client/errors'

import { recordJSException } from '../otelHelpers'
import { handleGQLErrors } from './apolloErrors'

// Watch out here, errors returned from these wrappers could be displayed on frontend.
// Make sure we are recording exceptions with detailed messages but returning errors with basic and user friendly text.
export const unlockMutationWrapper = async (
    unlockHealthPlanPackage: UnlockHealthPlanPackageMutationFn,
    id: string,
    unlockedReason: string
): Promise<HealthPlanPackage | GraphQLErrors | Error> => {
    try {
        const { data, errors } = await unlockHealthPlanPackage({
            variables: {
                input: {
                    pkgID: id,
                    unlockedReason,
                },
            },
        })

        if (errors) {
            handleGQLErrors(errors)
            recordJSException(
                `GraphQL error attempting to unlock. ID: ${id} Error message: ${errors}`
            )
            return new Error('Error attempting to unlock.')
        }

        if (data?.unlockHealthPlanPackage.pkg) {
            return data?.unlockHealthPlanPackage.pkg
        } else {
            return new Error('No errors, but also no unlock data.')
        }
    } catch (error) {
        // this can be an errors object
        if ('graphQLErrors' in error) {
            recordJSException(
                `GraphQL error attempting to unlock. ID: ${id} Error message: ${error.graphQLErrors}`
            )

            return new Error(
                'Error attempting to unlock. Submission may be already unlocked. Please refresh and try again.'
            )
        }
        recordJSException(
            `Apollo Client error attempting to unlock. ID: ${id} Error message: ${error.message}`
        )
        return new Error('Error attempting to unlock.')
    }
}

export const submitMutationWrapper = async (
    submitDraftSubmission: SubmitHealthPlanPackageMutationFn,
    id: string,
    submittedReason?: string
): Promise<Partial<HealthPlanPackage> | GraphQLErrors | Error> => {
    const input = { pkgID: id }

    if (submittedReason) {
        Object.assign(input, {
            submittedReason,
        })
    }
    try {
        const result = await submitDraftSubmission({
            variables: {
                input,
            },
        })

        if (result.errors) {
            recordJSException(
                `Error attempting to submit. ID: ${id} Error message: ${result.errors}`
            )
            return new Error('Error attempting to submit.')
        }

        if (result.data?.submitHealthPlanPackage.pkg) {
            return result.data.submitHealthPlanPackage.pkg
        } else {
            return new Error('Error attempting to submit.')
        }
    } catch (error) {
        const genericUserMessage = 'Error attempting to submit.'
        // const missingFieldsUserMessage =
        //     'Error attempting to submit. You need to fill out required fields, including any new fields.'
        // this can be an errors object
        if ('graphQLErrors' in error) {
            recordJSException(
                `GraphQL error attempting to submit. ID: ${id} Error message: ${error.graphQLErrors}`
            )

            return new Error(genericUserMessage)
        }

        recordJSException(
            `Apollo Client error attempting to submit. ID: ${id} Error message: ${error.message}`
        )
        return new Error(genericUserMessage)
    }
}
