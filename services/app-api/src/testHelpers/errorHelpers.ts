// For use in TESTS only. Throws a returned error
import type { StoreError } from '../postgres'
import { isStoreError } from '../postgres'

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
