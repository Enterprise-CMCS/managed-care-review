import {
    HealthPlanPackage,
    SubmitHealthPlanPackageMutationFn,
    UnlockHealthPlanPackageMutationFn,
} from '../gen/gqlClient'
import { GraphQLErrors } from '@apollo/client/errors'

import { recordJSException } from '../otelHelpers'

export const unlockMutationWrapper = async (
    unlockHealthPlanPackage: UnlockHealthPlanPackageMutationFn,
    id: string,
    unlockedReason: string
): Promise<HealthPlanPackage | GraphQLErrors | Error> => {
    try {
        const result = await unlockHealthPlanPackage({
            variables: {
                input: {
                    pkgID: id,
                    unlockedReason,
                },
            },
        })

        if (result.errors) {
            recordJSException(
                `GraphQL error attempting to unlock. ID: ${id} Error message: ${result.errors}`
            )
            return new Error('Error attempting to unlock. Please try again.')
        }

        if (result.data?.unlockHealthPlanPackage.pkg) {
            return result.data?.unlockHealthPlanPackage.pkg
        } else {
            return new Error('No errors, and no unlock result.')
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
        return new Error('Error attempting to unlock. Please try again.')
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
            return new Error('Error attempting to submit. Please try again.')
        }

        if (result.data?.submitHealthPlanPackage.pkg) {
            return result.data.submitHealthPlanPackage.pkg
        } else {
            return new Error('Error attempting to submit. Please try again.')
        }
    } catch (error) {
        // this can be an errors object
        if ('graphQLErrors' in error) {
            recordJSException(
                `GraphQL error attempting to submit. ID: ${id} Error message: ${error.graphQLErrors}`
            )

            return new Error('Error attempting to submit. Please try again.')
        }

        recordJSException(
            `Apollo Client error attempting to submit. ID: ${id} Error message: ${error.message}`
        )
        return new Error('Error attempting to submit. Please try again.')
    }
}
