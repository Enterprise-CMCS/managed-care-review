import type { MutationResolvers } from '../../gen/gqlServer'
import type { JWTLib } from '../../jwt'

function createAPIKeyResolver(jwt: JWTLib): MutationResolvers['createAPIKey'] {
    return async (_parent, _input, context) => {
        const { user } = context

        return jwt.createValidJWT(user.id)
    }
}

export { createAPIKeyResolver }
