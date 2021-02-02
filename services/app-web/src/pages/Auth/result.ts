export type Result<T, E extends Error> = Ok<T, E> | Err<T, E>

class Ok<T, E extends Error> {
    constructor(readonly value: T) {}

    isOk(): this is Ok<T, E> {
        return true
    }

    isErr(): this is Err<T, E> {
        return false
    }
}

class Err<T, E extends Error> {
    constructor(readonly error: E) {}

    isOk(): this is Ok<T, E> {
        return false
    }

    isErr(): this is Err<T, E> {
        return true
    }
}

export const ok = <T, E extends Error>(value: T): Ok<T, E> => new Ok(value)

export const err = <T, E extends Error>(err: E): Err<T, E> => new Err(err)
