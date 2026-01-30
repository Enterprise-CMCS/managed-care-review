import { ok, err } from 'neverthrow'
import type { Store } from '../postgres'
import { lookupUserAurora } from './cognitoAuthn'
import { initTracer, recordException } from '../../../uploads/src/lib/otel'

export async function userFromThirdPartyAuthorizer(
    store: Store,
    userId: string,
    delegatedUserId: string|null,
) {
    // setup otel tracing
    const otelCollectorURL = process.env.API_APP_OTEL_COLLECTOR_URL
    if (!otelCollectorURL || otelCollectorURL === '') {
        const errMsg =
            'Configuration Error: API_APP_OTEL_COLLECTOR_URL must be set'
        throw errMsg
    }

    const serviceName = 'third-party-authorizer'
    initTracer(serviceName, otelCollectorURL)

    try {
        // Lookup user from postgres - validates the user making the api
        const auroraUser = await lookupUserAurora(store, userId)
        if (auroraUser instanceof Error) {
            return err(auroraUser)
        }

        if (auroraUser === undefined) {
            return err(auroraUser)
        }

        // if delegatedUser is non-null, validate this user and return as context
        if (delegatedUserId) {
            const delegatedUser = await lookupUserAurora(store, delegatedUserId)
            
            if (delegatedUser instanceof Error) {
                return err(delegatedUser)
            }
            if (delegatedUser === undefined) {
                return err(delegatedUser)
            }

            //validate the delegated user is a CMS or CMS Approver role
            if (
                delegatedUser.role !== 'CMS_USER' &&
                delegatedUser.role !== 'CMS_APPROVER_USER'
            ) {
                return err(delegatedUser)
            }

            return ok(delegatedUser)
        }

        return ok(auroraUser)
    } catch {
        const err = new Error('ERROR: failed to look up user in postgres')

        recordException(err, serviceName, 'lookupUser')
        throw err
    }
}
