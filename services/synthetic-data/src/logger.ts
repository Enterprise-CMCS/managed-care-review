export type LogFields = Record<string, unknown>
export type LogSink = (line: string) => void

type LoggerOptions = {
    base?: LogFields
    sink?: LogSink
    now?: () => Date
}

const redactedKey =
    /authorization|clientsecret|accesstoken|presigned|uploadurl/i

function sanitize(value: unknown, key = ''): unknown {
    if (redactedKey.test(key)) {
        return '[REDACTED]'
    }

    if (value instanceof Error) {
        const details = Object.fromEntries(
            Object.entries(value)
                .filter(
                    ([entryKey]) =>
                        entryKey !== 'name' && entryKey !== 'message'
                )
                .map(([entryKey, entryValue]) => [
                    entryKey,
                    sanitize(entryValue, entryKey),
                ])
        )
        return {
            name: value.name,
            message: value.message,
            ...details,
        }
    }

    if (Array.isArray(value)) {
        return value.map((entry) => sanitize(entry))
    }

    if (typeof value === 'object' && value !== null) {
        return Object.fromEntries(
            Object.entries(value).map(([entryKey, entryValue]) => [
                entryKey,
                sanitize(entryValue, entryKey),
            ])
        )
    }

    return value
}

export class Logger {
    readonly #base: LogFields
    readonly #sink: LogSink
    readonly #now: () => Date

    constructor(options: LoggerOptions = {}) {
        this.#base = options.base ?? {}
        this.#sink = options.sink ?? console.info
        this.#now = options.now ?? (() => new Date())
    }

    info(event: string, fields: LogFields = {}): void {
        this.#write('info', event, fields)
    }

    error(event: string, error: unknown, fields: LogFields = {}): void {
        this.#write('error', event, { ...fields, error })
    }

    #write(level: 'info' | 'error', event: string, fields: LogFields): void {
        this.#sink(
            JSON.stringify(
                sanitize({
                    timestamp: this.#now().toISOString(),
                    level,
                    event,
                    ...this.#base,
                    ...fields,
                })
            )
        )
    }
}
