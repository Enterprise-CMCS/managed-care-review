import { createForbiddenError, createUserInputError } from '../errorUtils'
import { toDomain } from '@mc-review/hpp'
import type { ContractType } from '../../domain-models'
import {
    convertContractWithRatesToUnlockedHPP,
    hasCMSPermissions,
} from '../../domain-models'
import type { Emailer } from '../../emailer'
import type { MutationResolvers } from '../../gen/gqlServer'
import { logError, logSuccess } from '../../logger'
import { NotFoundError, handleNotFoundError } from '../../postgres'
import type { Store } from '../../postgres'
import {
    setErrorAttributesOnActiveSpan,
    setResolverDetailsOnActiveSpan,
    setSuccessAttributesOnActiveSpan,
} from '../attributeHelper'
import { GraphQLError } from 'graphql'

// unlockHealthPlanPackageResolver is a state machine transition for HealthPlanPackage
export function unlockHealthPlanPackageResolver(
    store: Store,
    emailer: Emailer
): MutationResolvers['unlockHealthPlanPackage'] {
    return async (_parent, { input }, context) => {
        const { user, ctx, tracer } = context
        const span = tracer?.startSpan('unlockHealthPlanPackage', {}, ctx)
        setResolverDetailsOnActiveSpan('unlockHealthPlanPackage', user, span)

        const { unlockedReason, pkgID } = input
        span?.setAttribute('mcreview.package_id', pkgID)

        // This resolver is only callable by CMS users
        if (!hasCMSPermissions(user)) {
            logError(
                'unlockHealthPlanPackage',
                'user not authorized to unlock package'
            )
            setErrorAttributesOnActiveSpan(
                'user not authorized to unlock package',
                span
            )
            throw createForbiddenError('user not authorized to unlock package')
        }

        const contractResult = await store.findContractWithHistory(pkgID)

        if (contractResult instanceof Error) {
            if (contractResult instanceof NotFoundError) {
                throw handleNotFoundError(contractResult)
            }

            const errMessage = `Issue finding a package. Message: ${contractResult.message}`
            logError('unlockHealthPlanPackage', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new GraphQLError(errMessage, {
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                    cause: 'DB_ERROR',
                },
            })
        }

        const contract: ContractType = contractResult

        if (contract.draftRevision) {
            const errMessage = `Attempted to unlock package with wrong status`
            logError('unlockHealthPlanPackage', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw createUserInputError(errMessage, 'pkgID')
        }

        // Now, unlock the contract!
        const unlockContractResult = await store.unlockContract(
            {
                contractID: contract.id,
                unlockReason: unlockedReason,
                unlockedByUserID: user.id,
            },
            true // linked rates feature flag is permanently on
        )
        if (unlockContractResult instanceof Error) {
            const errMessage = `Failed to unlock contract revision with ID: ${contract.id}; ${unlockContractResult.message}`
            logError('unlockHealthPlanPackage', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new GraphQLError(errMessage, {
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                    cause: 'DB_ERROR',
                },
            })
        }

        const unlockedPKGResult =
            convertContractWithRatesToUnlockedHPP(unlockContractResult)

        if (unlockedPKGResult instanceof Error) {
            const errMessage = `Error converting draft contract. Message: ${unlockedPKGResult.message}`
            logError('unlockHealthPlanPackage', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new GraphQLError(errMessage, {
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                    cause: 'PROTO_DECODE_ERROR',
                },
            })
        }

        // set variables used across feature flag boundary
        const unlockedPackage = unlockedPKGResult

        // Send emails!

        const formDataResult = toDomain(
            unlockedPackage.revisions[0].formDataProto
        )
        if (formDataResult instanceof Error) {
            const errMessage = `Couldn't unbox unlocked proto. Message: ${formDataResult.message}`
            logError('unlockHealthPlanPackage', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new GraphQLError(errMessage, {
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                    cause: 'DB_ERROR',
                },
            })
        }

        if (formDataResult.status === 'SUBMITTED') {
            const errMessage = `Programming Error: Got SUBMITTED from an unlocked pkg.`
            logError('unlockHealthPlanPackage', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new GraphQLError(errMessage, {
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                    cause: 'DB_ERROR',
                },
            })
        }

        logSuccess('unlockHealthPlanPackage')
        setSuccessAttributesOnActiveSpan(span)

        return { pkg: unlockedPackage }
    }
}
