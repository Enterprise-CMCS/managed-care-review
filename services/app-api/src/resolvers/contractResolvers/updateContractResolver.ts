import { ForbiddenError, UserInputError } from 'apollo-server-lambda'
import { isCMSUser } from '../../domain-models'
import type { MutationResolvers, State } from '../../gen/gqlServer'
import { logError, logSuccess } from '../../logger'
import type { InsertHealthPlanPackageArgsType, Store } from '../../postgres'
import { isStoreError } from '../../postgres'
import { pluralize } from '../../../../app-web/src/common-code/formatters'
import {
    setResolverDetailsOnActiveSpan,
    setErrorAttributesOnActiveSpan,
    setSuccessAttributesOnActiveSpan,
} from '../attributeHelper'
import { GraphQLError } from 'graphql/index'
import type { LDService } from '../../launchDarkly/launchDarkly'
import { convertContractToUnlockedHealthPlanPackage } from '../../domain-models'

export function updateContractResolver(
    store: Store,
    launchDarkly: LDService
): MutationResolvers['updateContract'] {
    return async (_parent, { input }, context) => {
        const { user, span } = context
        setResolverDetailsOnActiveSpan('updateContract', user, span)

        const ratesDatabaseRefactor = await launchDarkly.getFeatureFlag(
            context,
            'rates-db-refactor'
        )

        // This resolver is only callable by state users
        if (!isCMSUser(user)) {
            logError(
                'updateContract',
                'user not authorized to update contract'
            )
            setErrorAttributesOnActiveSpan(
                'user not authorized to update contract',
                span
            )
            throw new ForbiddenError('user not authorized to update contract')
        }

        throw new Error("unimplemented")
    }
}
