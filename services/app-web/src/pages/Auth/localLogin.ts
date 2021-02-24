import { UserType, isUser } from '../../common-code/domain-models'

const localUserKey = 'localUser'

// loginLocalUser stores a local user in local storage
export function loginLocalUser(user: UserType): void {
    console.log('SET LOCAL LOGIN')
    const store = window.localStorage
    store.setItem(localUserKey, JSON.stringify(user))
}

// Matching the signature for cognito signout for now.
export async function logoutLocalUser(): Promise<null> {
    console.log('SET LOCAL LOGOUT')
    const store = window.localStorage
    store.removeItem(localUserKey)
    return null
}

// getLoggedInUser retrieves a local user if one is logged in
export function getLoggedInUser(): Promise<UserType | null> {
    const store = window.localStorage
    const storedUserString = store.getItem(localUserKey)

    return new Promise((accept, reject) => {
        if (storedUserString === null) {
            accept(null)
            return
        }
        try {
            const storedUser = JSON.parse(storedUserString)

            if (isUser(storedUser)) {
                accept(storedUser)
                return
            } else {
                reject(new Error('garbled user stored in localStorage'))
                return
            }
        } catch (e) {
            reject(e)
            return
        }
    })
}
