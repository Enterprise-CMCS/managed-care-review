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
    let lastError: unknown

    for (let attempt = 1; attempt <= options.maxAttempts; attempt += 1) {
        let result: T | undefined

        try {
            result = await operation(attempt)
            if (!options.shouldRetry(undefined, result)) {
                return result
            }
        } catch (error) {
            lastError = error
            if (!options.shouldRetry(error, undefined)) {
                throw error
            }
        }

        if (attempt < options.maxAttempts) {
            await sleep(options.baseDelayMs * 2 ** (attempt - 1))
        }
    }

    if (lastError !== undefined) {
        throw lastError
    }

    throw new Error(`Operation failed after ${options.maxAttempts} attempts`)
}
