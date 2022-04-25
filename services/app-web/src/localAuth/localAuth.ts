import { isLocalUser, LocalUserType } from './LocalUserType'

const localUserKey = 'localUser'

// loginLocalUser stores a local user in local storage
function loginLocalUser(user: LocalUserType): void {
    const store = window.localStorage
    store.setItem(localUserKey, JSON.stringify(user))
}

// Matching the signature for Local signout for now.
async function logoutLocalUser(): Promise<null> {
    const store = window.localStorage
    store.removeItem(localUserKey)
    return null
}

// getLoggedInUser retrieves a local user if one is logged in
function getLoggedInUser(): Promise<LocalUserType | null> {
    const store = window.localStorage
    const storedUserString = store.getItem(localUserKey)

    return new Promise((accept, reject) => {
        if (storedUserString === null) {
            accept(null)
            return
        }
        try {
            const storedUser = JSON.parse(storedUserString)

            if (isLocalUser(storedUser)) {
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

export { loginLocalUser, logoutLocalUser, getLoggedInUser }
