import { ForbiddenError } from 'apollo-server-lambda'
import {
    isCMSUser,
    convertContractWithRatesToUnlockedHPP,
} from '../../domain-models'
import type { MutationResolvers } from '../../gen/gqlServer'
import { logError } from '../../logger'
import type { Store } from '../../postgres'
import {
    setResolverDetailsOnActiveSpan,
    setErrorAttributesOnActiveSpan,
} from '../attributeHelper'
import type { LDService } from '../../launchDarkly/launchDarkly'
import { GraphQLError } from 'graphql'

export function updateContractResolver(
    store: Store,
    launchDarkly: LDService
): MutationResolvers['updateContract'] {
    return async (_parent, { input }, context) => {
        const { user, span } = context
        setResolverDetailsOnActiveSpan('updateContract', user, span)
        // const ratesDatabaseRefactor = await launchDarkly.getFeatureFlag(
        //     context,
        //     'rates-db-refactor'
        // )

        // This resolver is only callable by state users
        if (!isCMSUser(user)) {
            logError('updateContract', 'user not authorized to update contract')
            setErrorAttributesOnActiveSpan(
                'user not authorized to update contract',
                span
            )
            throw new ForbiddenError('user not authorized to update contract')
        }
        const contract = await store.findContractWithHistory(input.id)
        if (contract instanceof Error) {
            throw contract
        }

        const convertedPkg = convertContractWithRatesToUnlockedHPP(contract)

        if (convertedPkg instanceof Error) {
            const errMessage = `Issue converting contract. Message: ${convertedPkg.message}`
            logError('fetchHealthPlanPackage', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new GraphQLError(errMessage, {
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                    cause: 'PROTO_DECODE_ERROR',
                },
            })
        }
        return {
            pkg: convertedPkg,
        }
    }
}
