import type { MutationResolvers } from '../../gen/gqlServer'
import type { JWTLib } from '../../jwt'
import {
    canWrite,
    getAuthContextInfo,
} from '../../authorization/oauthAuthorization'
import { logError } from '../../logger'
import {
    setErrorAttributesOnActiveSpan,
    setResolverDetailsOnActiveSpan,
} from '../attributeHelper'
import { GraphQLError } from 'graphql/index'

function createAPIKeyResolver(jwt: JWTLib): MutationResolvers['createAPIKey'] {
    return async (_parent, _input, context) => {
        const { user, tracer, ctx } = context
        const span = tracer?.startSpan('createAPIKey', {}, ctx)
        setResolverDetailsOnActiveSpan('createAPIKey', user, span)

        // Check OAuth client read permissions
        if (!canWrite(context)) {
            const authInfo = getAuthContextInfo(context)
            const errMessage = `OAuth client ${authInfo.clientId} does not have write permissions`
            logError('createAPIKey', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)

            throw new GraphQLError(errMessage, {
                extensions: {
                    code: 'FORBIDDEN',
                    cause: 'INSUFFICIENT_OAUTH_GRANTS',
                },
            })
        }

        return jwt.createValidJWT(user.id)
    }
}

export { createAPIKeyResolver }
