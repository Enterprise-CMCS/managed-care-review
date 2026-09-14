export type RetryOptions<T> = {
    maxAttempts: number
    baseDelayMs: number
    shouldRetry: (error: unknown, result: T | undefined) => boolean
    sleep?: (milliseconds: number) => Promise<void>
}

const defaultSleep = (milliseconds: number): Promise<void> => {
    const { promise, resolve } = Promise.withResolvers<void>()
    setTimeout(resolve, milliseconds)
    return promise
}

export async function retry<T>(
    operation: (attempt: number) => Promise<T>,
    options: RetryOptions<T>
): Promise<T> {
    const sleep = options.sleep ?? defaultSleep
    let lastResult: T | undefined
    let hasLastResult = false
    let lastError: unknown
    let hasLastError = false
    for (let attempt = 1; attempt <= options.maxAttempts; attempt += 1) {
        let result: T | undefined

        try {
            result = await operation(attempt)
            if (!options.shouldRetry(undefined, result)) {
                return result
            }
            lastResult = result
            hasLastResult = true
            hasLastError = false
        } catch (error) {
            lastError = error
            hasLastError = true
            hasLastResult = false
            if (!options.shouldRetry(error, undefined)) {
                throw error
            }
        }

        if (attempt < options.maxAttempts) {
            await sleep(options.baseDelayMs * 2 ** (attempt - 1))
        }
    }

    if (hasLastResult) {
        return lastResult as T
    }

    if (hasLastError) {
        throw lastError
    }

    throw new Error(
        `Operation did not run with maxAttempts=${options.maxAttempts}`
    )
}
