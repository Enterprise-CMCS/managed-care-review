import { useState, useEffect } from 'react'
import { LocalStorageKeyType } from '../constants/localStorage'
type LocalStorage = {
    key: LocalStorageKeyType
    value: string | null
}

type UseLocalStorage = [LocalStorage['value'], (value: string | null) => void]
// Get, set, and remove keys from local storage with error handling. Returns a tuple similar to setState with one additional function [ value, setValue, clearValue]
function useLocalStorage(
    key: LocalStorage['key'],
    defaultValue: LocalStorage['value']
): UseLocalStorage {
    const [storedValue, setStoredValue] = useState<string | null>(() => {
        if (typeof window === 'undefined') {
            console.error('Unable to find local storage. window is undefined')
            return defaultValue
        }

        let value
        try {
            value = JSON.parse(
                window.localStorage.getItem(key) || JSON.stringify(defaultValue)
            )
        } catch (error) {
            console.error(
                `Unable to set local storage. Error message: ${error}`
            )
            value = defaultValue
        }
        return value
    })

    useEffect(() => {
        if (storedValue === null) {
            try {
                window.localStorage.removeItem(key)
            } catch (error) {
                console.error(
                    `Unable to remove ${key} local storage. Error message: ${error.message}`
                )
            }
        } else {
            try {
                window.localStorage.setItem(key, JSON.stringify(storedValue))
            } catch (error) {
                console.error(
                    `Unable to set ${key} in local storage. Error message: ${error.message}`
                )
            }
        }
    }, [key, storedValue])

    return [storedValue, setStoredValue]
}

export { useLocalStorage }
