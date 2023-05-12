import { useCallback, useEffect, useRef } from 'react'

export function useDebouncedCallback<A extends unknown[], R>(
    callback: (...args: A) => Promise<R>,
    delay: number
) {
    const callbackRef = useRef(callback)
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => {
        callbackRef.current = callback
    }, [callback])

    return useCallback(
        (...args: A) => {
            return new Promise<R>((resolve, reject) => {
                if (timerRef.current !== null) {
                    clearTimeout(timerRef.current)
                }
                timerRef.current = setTimeout(async () => {
                    try {
                        const result = await callbackRef.current(...args)
                        resolve(result)
                    } catch (error) {
                        reject(error)
                    }
                }, delay)
            })
        },
        [delay]
    )
}
