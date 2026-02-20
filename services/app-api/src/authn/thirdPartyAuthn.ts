import type { Store } from '../postgres'
import { lookupUserAurora } from './cognitoAuthn'
import { initTracer, recordException } from '../otel/otel_handler'
import type { UserType } from '../domain-models'

export async function userFromThirdPartyAuthorizer(
    store: Store,
    userId: string,
    delegatedUserId: string | null
): Promise<UserType | Error> {
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
        // if delegatedUser is non-null, validate this user and return as context
        if (delegatedUserId) {
            const delegatedUser = await lookupUserAurora(store, delegatedUserId)

            if (delegatedUser instanceof Error) {
                return new Error(
                    `Fetch delegated user error. ${delegatedUser.message}`
                )
            }
            if (delegatedUser === undefined) {
                return new Error(
                    'Fetch delegated user error. Delegated user not found in db.'
                )
            }

            //validate the delegated user is a CMS or CMS Approver role
            if (
                delegatedUser.role !== 'CMS_USER' &&
                delegatedUser.role !== 'CMS_APPROVER_USER'
            ) {
                return new Error(
                    `Fetch delegated user error. Delegated user not authorized. Role: ${delegatedUser.role}`
                )
            }

            return delegatedUser
        } else {
            // Lookup user from postgres - validates for non-delegated user
            const auroraUser = await lookupUserAurora(store, userId)
            if (auroraUser instanceof Error) {
                return new Error(auroraUser.message)
            }

            if (auroraUser === undefined) {
                return new Error('User not found in db.')
            }
            return auroraUser
        }
    } catch {
        const err = new Error('ERROR: failed to look up user in postgres')

        recordException(err, serviceName, 'lookupUser')
        throw err
    }
}
