import { ForbiddenError, UserInputError } from 'apollo-server-lambda'
import type { UpdateInfoType } from '../../domain-models'
import { isCMSUser, contractSubmitters } from '../../domain-models'
import type { Emailer } from '../../emailer'
import type { MutationResolvers } from '../../gen/gqlServer'
import { logError, logSuccess } from '../../logger'
import { NotFoundError } from '../../postgres'
import type { Store } from '../../postgres'

import {
    setErrorAttributesOnActiveSpan,
    setResolverDetailsOnActiveSpan,
    setSuccessAttributesOnActiveSpan,
} from '../attributeHelper'
import type { EmailParameterStore } from '../../parameterStore'
import { GraphQLError } from 'graphql'
import type { LDService } from '../../launchDarkly/launchDarkly'

export function unlockContractResolver(
    store: Store,
    emailer: Emailer,
    emailParameterStore: EmailParameterStore,
    _launchDarkly: LDService
): MutationResolvers['unlockContract'] {
    return async (_parent, { input }, context) => {
        const { user, ctx, tracer } = context
        const span = tracer?.startSpan('unlockContract', {}, ctx)
        setResolverDetailsOnActiveSpan('unlockContract', user, span)

        const { unlockedReason, contractID } = input
        span?.setAttribute('mcreview.package_id', contractID)

        // This resolver is only callable by CMS users
        if (!isCMSUser(user)) {
            logError('unlockContract', 'user not authorized to unlock contract')
            setErrorAttributesOnActiveSpan(
                'user not authorized to unlock contract',
                span
            )
            throw new ForbiddenError('user not authorized to unlock contract')
        }

        const contractResult = await store.findContractWithHistory(contractID)
        if (contractResult instanceof Error) {
            if (contractResult instanceof NotFoundError) {
                const errMessage = `A contract must exist to be unlocked: ${contractID}`
                logError('unlockContract', errMessage)
                setErrorAttributesOnActiveSpan(errMessage, span)
                throw new UserInputError(errMessage, {
                    argumentName: 'contractID',
                })
            }

            const errMessage = `Issue finding a contract. Message: ${contractResult.message}`
            logError('unlockContract', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new GraphQLError(errMessage, {
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                    cause: 'DB_ERROR',
                },
            })
        }

        if (contractResult.draftRevision) {
            const errMessage = `Attempted to unlock contract with wrong status`
            logError('unlockContract', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new UserInputError(errMessage, {
                argumentName: 'contractID',
                cause: 'INVALID_PACKAGE_STATUS',
            })
        }

        const unlockContractResult = await store.unlockContract({
            contractID: contractResult.id,
            unlockReason: unlockedReason,
            unlockedByUserID: user.id,
        })
        if (unlockContractResult instanceof Error) {
            const errMessage = `Failed to unlock contract revision with ID: ${contractResult.id}; ${unlockContractResult.message}`
            logError('unlockContract', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new GraphQLError(errMessage, {
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                    cause: 'DB_ERROR',
                },
            })
        }
        if (unlockContractResult.status != 'UNLOCKED') {
            const errMessage = `Programming Error: Got incorrect from an unlocked contract.`
            logError('unlockContract', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new GraphQLError(errMessage, {
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                    cause: 'DB_ERROR',
                },
            })
        }

        // Get state analysts emails from parameter store
        let stateAnalystsEmails =
            await emailParameterStore.getStateAnalystsEmails(
                unlockContractResult.stateCode
            )
        //If error, log it and set stateAnalystsEmails to empty string as to not interrupt the emails.
        if (stateAnalystsEmails instanceof Error) {
            logError('getStateAnalystsEmails', stateAnalystsEmails.message)
            setErrorAttributesOnActiveSpan(stateAnalystsEmails.message, span)
            stateAnalystsEmails = []
        }

        // Get submitter email from every pkg submitted revision.
        const submitterEmails = contractSubmitters(unlockContractResult)

        const statePrograms = store.findStatePrograms(
            unlockContractResult.stateCode
        )

        if (statePrograms instanceof Error) {
            logError('findStatePrograms', statePrograms.message)
            setErrorAttributesOnActiveSpan(statePrograms.message, span)
            throw new GraphQLError(statePrograms.message, {
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                    cause: 'DB_ERROR',
                },
            })
        }

        const updateInfo: UpdateInfoType = {
            updatedAt: new Date(), // technically this is not right but it's close enough while we are supporting two systems
            updatedBy: context.user.email,
            updatedReason: unlockedReason,
        }

        const contractRev = unlockContractResult.revisions[0]
        const unlockContractCMSEmailResult =
            await emailer.sendUnlockContractCMSEmail(
                contractRev,
                updateInfo,
                stateAnalystsEmails,
                statePrograms
            )

        const unlockContractStateEmailResult =
            await emailer.sendUnlockContractStateEmail(
                contractRev,
                updateInfo,
                statePrograms,
                submitterEmails
            )

        if (
            unlockContractCMSEmailResult instanceof Error ||
            unlockContractStateEmailResult instanceof Error
        ) {
            if (unlockContractCMSEmailResult instanceof Error) {
                logError(
                    'unlockContractCMSEmail - CMS email failed',
                    unlockContractCMSEmailResult
                )
                setErrorAttributesOnActiveSpan('CMS email failed', span)
            }
            if (unlockContractStateEmailResult instanceof Error) {
                logError(
                    'unlockContractStateEmail - state email failed',
                    unlockContractStateEmailResult
                )
                setErrorAttributesOnActiveSpan('state email failed', span)
            }
            throw new GraphQLError('Email failed.', {
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                    cause: 'EMAIL_ERROR',
                },
            })
        }

        logSuccess('unlockContract')
        setSuccessAttributesOnActiveSpan(span)

        return { contract: unlockContractResult }
    }
}
