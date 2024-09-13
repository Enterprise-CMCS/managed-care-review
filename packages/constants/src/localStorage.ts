/*
 * Contains a list of all our local storage keys. This is used to give us type safety
 * around local storage keys
 */

const LOCAL_STORAGE_KEYS = ['LOGIN_REDIRECT'] as const

export type LocalStorageKeyType = typeof LOCAL_STORAGE_KEYS[number]

export const LocalStorageKeys: Record<LocalStorageKeyType, string> = {
    /**
     * Stores application URL path that requires authentication. Used when a logged out user tries to visit an authenticated path. We will redirect them after a successful login in these cases.
     */
    LOGIN_REDIRECT: 'LOGIN_REDIRECT',
}
