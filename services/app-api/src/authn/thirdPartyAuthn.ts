import { ok, err } from 'neverthrow'
import type { Store } from '../postgres'
import { lookupUserAurora } from './cognitoAuthn'
import { initTracer, recordException } from '../../../uploads/src/lib/otel'

export async function userFromThirdPartyAuthorizer(
    store: Store,
    userId: string
) {
    // setup otel tracing
    const otelCollectorURL = process.env.REACT_APP_OTEL_COLLECTOR_URL
    if (!otelCollectorURL || otelCollectorURL === '') {
        const errMsg =
            'Configuration Error: REACT_APP_OTEL_COLLECTOR_URL must be set'
        throw errMsg
    }

    const serviceName = 'third-party-authorizer'
    initTracer(serviceName, otelCollectorURL)

    try {
        // Lookup user from postgres
        const auroraUser = await lookupUserAurora(store, userId)
        if (auroraUser instanceof Error) {
            return err(auroraUser)
        }

        if (auroraUser === undefined) {
            return err(auroraUser)
        }

        return ok(auroraUser)
    } catch (e) {
        const err = new Error('ERROR: failed to look up user in postgres')

        recordException(err, serviceName, 'lookupUser')
        throw err
    }
}
