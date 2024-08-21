import {
    UpdateCmsUserInput,
    UpdateCmsUserMutationFn,
    UpdateCmsUserPayload,
} from '../gen/gqlClient'

async function updateCMSUser(
    updateUserMutation: UpdateCmsUserMutationFn,
    input: UpdateCmsUserInput
): Promise<UpdateCmsUserPayload | Error> {
    try {
        const res = await updateUserMutation({ variables: { input } })
        const user = res.data?.updateCMSUser
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

export { updateCMSUser }
