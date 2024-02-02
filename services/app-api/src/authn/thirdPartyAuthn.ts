import { ok, err } from 'neverthrow'
import type { Store } from '../postgres'
import { lookupUserAurora } from './cognitoAuthn'
import { initTracer, recordException } from '../../../uploads/src/lib/otel'

export async function userFromThirdPartyAuthorizer(
    store: Store,
    userId: string,
    ipAddress: string
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
    const allowedIpAddresses = process.env.ALLOWED_IP_ADDRESSES
    if (allowedIpAddresses === undefined || allowedIpAddresses === '') {
        throw new Error(
            'Configuration Error: ALLOWED_IP_ADDRESSES is required to run app-api.'
        )
    }
    try {
        const ipAddressIsValid = allowedIpAddresses.includes(ipAddress)
        if (!ipAddressIsValid) {
            const errMsg = new Error(
                `IP address: ${ipAddress} is not in the allowed list`
            )
            return err(errMsg)
        }
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
