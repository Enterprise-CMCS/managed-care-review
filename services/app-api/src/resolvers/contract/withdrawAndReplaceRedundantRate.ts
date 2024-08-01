import { ForbiddenError, UserInputError } from 'apollo-server-lambda'
import { isAdminUser } from '../../domain-models'
import type { MutationResolvers } from '../../gen/gqlServer'
import { logError, logSuccess } from '../../logger'
import {
    NotFoundError,
    UserInputPostgresError,
    type Store,
} from '../../postgres'

import {
    setErrorAttributesOnActiveSpan,
    setResolverDetailsOnActiveSpan,
    setSuccessAttributesOnActiveSpan,
} from '../attributeHelper'
import { GraphQLError } from 'graphql'

/**
 * withdrawAndReplaceRedundantRate
 * @param store
 * @returns an updated contract
 *
 * withdrawAndReplaceRedundantRate
 * this is an admin only action
 * replaces an existing child rate with a linked rate
 * and in the process, marks old child rate as withdrawn and logs activity in changelog for both contract and rates
 */

export function withdrawAndReplaceRedundantRateResolver(
    store: Store
): MutationResolvers['withdrawAndReplaceRedundantRate'] {
    return async (_parent, { input }, context) => {
        const { user, ctx, tracer } = context
        const span = tracer?.startSpan(
            'withdrawAndReplaceRedundantRate',
            {},
            ctx
        )
        setResolverDetailsOnActiveSpan(
            'withdrawAndReplaceRedundantRate',
            user,
            span
        )

        const {
            contractID,
            replaceReason,
            withdrawnRateID,
            replacementRateID,
        } = input
        span?.setAttribute('mcreview.package_id', contractID)

        if (!isAdminUser(user)) {
            const message =
                'user not authorized to withdraw or replace rate on contract'
            logError('withdrawAndReplaceRedundantRate', message)
            setErrorAttributesOnActiveSpan(message, span)
            throw new ForbiddenError(message)
        }

        const withdrawAndReplaceRedundantRateResult =
            await store.replaceRateOnContract({
                contractID: contractID,
                replacementRateID,
                withdrawnRateID,
                replaceReason,
                replacedByUserID: user.id,
            })

        if (
            withdrawAndReplaceRedundantRateResult instanceof
            UserInputPostgresError
        ) {
            throw new UserInputError(
                withdrawAndReplaceRedundantRateResult.message
            )
        }

        if (withdrawAndReplaceRedundantRateResult instanceof NotFoundError) {
            throw new GraphQLError(
                withdrawAndReplaceRedundantRateResult.message,
                {
                    extensions: {
                        code: 'NOT_FOUND',
                        cause: 'DB_ERROR',
                    },
                }
            )
        }

        if (withdrawAndReplaceRedundantRateResult instanceof Error) {
            const errMessage = `Failed to replace rate on contract ID: ${contractID}; ${withdrawAndReplaceRedundantRateResult.message}`
            logError('withdrawAndReplaceRedundantRate', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new GraphQLError(errMessage, {
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                    cause: 'DB_ERROR',
                },
            })
        }

        logSuccess('withdrawAndReplaceRedundantRate')
        setSuccessAttributesOnActiveSpan(span)

        return { contract: withdrawAndReplaceRedundantRateResult }
    }
}
