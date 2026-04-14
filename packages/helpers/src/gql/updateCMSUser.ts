import type { MutationFunction } from '@apollo/client'
import {
    UpdateDivisionAssignmentInput,
    UpdateDivisionAssignmentMutation,
    UpdateDivisionAssignmentMutationVariables,
    UpdateCmsUserPayload,
} from '../gen/gqlClient'

async function updateDivisionAssignment(
    updateUserMutation: MutationFunction<UpdateDivisionAssignmentMutation, UpdateDivisionAssignmentMutationVariables>,
    input: UpdateDivisionAssignmentInput
): Promise<UpdateCmsUserPayload | Error> {
    try {
        const res = await updateUserMutation({ variables: { input } })
        const user = res.data?.updateDivisionAssignment
        if (!user) {
            return new Error(
                'Unexpected Error: no user returned buy update mutation'
            )
        }

        return user
    } catch (err) {
        return err
    }
}

export { updateDivisionAssignment }
