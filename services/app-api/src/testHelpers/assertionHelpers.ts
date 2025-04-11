// Functions that assists with type narrow in jest tests

// must -  interrupts test flow to through an error
function must<T>(maybeErr: T | Error): T {
    if (maybeErr instanceof Error) {
        throw maybeErr
    }
    return maybeErr
}

// expectToBeDefined - properly  type narrows the results of toBeDefined
// https://github.com/DefinitelyTyped/DefinitelyTyped/issues/41179 would eventually address this but is not implemented
function expectToBeDefined<T>(arg: T): asserts arg is NonNullable<T> {
    expect(arg).toBeDefined()
}

export { must, expectToBeDefined }
