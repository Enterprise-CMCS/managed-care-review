import { useState, useEffect } from 'react'
import { LocalStorageKeyType } from '@mc-review/constants'
import { recordJSException } from '@mc-review/otel'
type LocalStorage = {
    key: LocalStorageKeyType
    value: string | string[] | boolean | object | null
}

type UseLocalStorage = [
    LocalStorage['value'],
    (value: LocalStorage['value']) => void,
]
// Get and set keys in local storage. If key is set to a value of null, clear and remove from local storage, return default fallback value
function useLocalStorage(
    key: LocalStorage['key'],
    defaultValue: LocalStorage['value']
): UseLocalStorage {
    const [storedValue, setStoredValue] = useState<LocalStorage['value']>(
        () => {
            if (typeof window === 'undefined') {
                recordJSException(
                    'Unable to find local storage. window is undefined'
                )
                return defaultValue
            }

            let value
            try {
                value = JSON.parse(
                    window.localStorage.getItem(key) ||
                        JSON.stringify(defaultValue)
                )
            } catch (error) {
                recordJSException(
                    `Unable to set local storage. Error message: ${error}`
                )
                value = defaultValue
            }
            return value
        }
    )

    useEffect(() => {
        if (storedValue === null) {
            try {
                window.localStorage.removeItem(key)
            } catch (error) {
                recordJSException(
                    `Unable to remove ${key} local storage. Error message: ${error.message}`
                )
            }
        } else {
            try {
                window.localStorage.setItem(key, JSON.stringify(storedValue))
            } catch (error) {
                recordJSException(
                    `Unable to set ${key} in local storage. Error message: ${error.message}`
                )
            }
        }
    }, [key, storedValue])

    return [storedValue, setStoredValue]
}

export { useLocalStorage }
