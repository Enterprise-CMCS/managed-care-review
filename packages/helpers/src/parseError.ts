/**
 * Coerce an unknown caught value into an Error. JS lets you throw anything,
 * so catch blocks typed as `unknown` need narrowing before accessing fields
 * like `.message`. Non-Error object fields (e.g. AWS SDK `code`) are copied
 * onto the returned Error.
 */
export function parseErrorToError(err: unknown): Error {
    if (err instanceof Error) return err

    if (typeof err === 'string') return new Error(err)

    if (err !== null && typeof err === 'object') {
        const obj = err as Record<string, unknown>
        const message =
            typeof obj.message === 'string' ? obj.message : String(err)
        const error = new Error(message)
        for (const key of Object.keys(obj)) {
            if (key === 'message' || key === 'stack' || key === 'name') continue
            try {
                ;(error as unknown as Record<string, unknown>)[key] = obj[key]
            } catch {
                // ignore read-only or non-writable keys
            }
        }
        return error
    }

    try {
        return new Error(String(err))
    } catch {
        return new Error('Unknown error')
    }
}
