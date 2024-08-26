import {
    UpdateDivisionAssignmentInput,
    UpdateDivisionAssignmentMutationFn,
    UpdateCmsUserPayload,
} from '../gen/gqlClient'

async function updateDivisionAssignment(
    updateUserMutation: UpdateDivisionAssignmentMutationFn,
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
