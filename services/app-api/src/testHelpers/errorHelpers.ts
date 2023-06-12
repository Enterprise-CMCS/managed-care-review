// For use in TESTS only. Throws a returned error
function must<T>(maybeErr: T | Error): T {
    if (maybeErr instanceof Error) {
        throw maybeErr
    }
    return maybeErr
}

export { must }
