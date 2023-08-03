// For use in TESTS only. Throws a returned error
import { isStoreError, StoreError } from '../postgres'

function must<T>(maybeErr: T | Error | StoreError): T {
    if (maybeErr instanceof Error) {
        throw maybeErr
    }

    if (isStoreError(maybeErr)) {
        throw maybeErr
    }
    return maybeErr
}

export { must }
