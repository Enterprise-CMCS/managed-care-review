import { ForbiddenError } from 'apollo-server-lambda'
import { isAdminUser } from '../../domain-models'
import { Emailer } from '../../emailer'
import { QueryResolvers } from '../../gen/gqlServer'
import { logError, logSuccess } from '../../logger'
import {
    setErrorAttributesOnActiveSpan,
    setResolverDetailsOnActiveSpan,
    setSuccessAttributesOnActiveSpan,
} from '../attributeHelper'

export function fetchEmailSettingsResolver(
    emailer: Emailer
): QueryResolvers['fetchEmailSettings'] {
    return async (_parent, __, context) => {
        const { user, span } = context
        if (!isAdminUser(user)) {
            const errMessage =
                'Non-admin user not authorized to fetch a settings'
            logError('fetchEmailSettings', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new ForbiddenError(errMessage)
        }

        setResolverDetailsOnActiveSpan('fetchEmailSettings', user, span)

        const config = emailer.config
        logSuccess('fetchEmailSettings')
        setSuccessAttributesOnActiveSpan(span)
        return { config }
    }
}
