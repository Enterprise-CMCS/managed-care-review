import { ForbiddenError, UserInputError } from 'apollo-server-lambda'
import type { UpdateInfoType } from '../../domain-models'
import { contractSubmitters, hasCMSPermissions } from '../../domain-models'
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
import type { StateCodeType } from '../../testHelpers'

export function unlockContractResolver(
    store: Store,
    emailer: Emailer,
    emailParameterStore: EmailParameterStore,
    launchDarkly: LDService
): MutationResolvers['unlockContract'] {
    return async (_parent, { input }, context) => {
        const { user, ctx, tracer } = context
        const span = tracer?.startSpan('unlockContract', {}, ctx)
        setResolverDetailsOnActiveSpan('unlockContract', user, span)

        const { unlockedReason, contractID } = input
        span?.setAttribute('mcreview.package_id', contractID)

        const featureFlags = await launchDarkly.allFlags(context)
        const readStateAnalystsFromDBFlag =
            featureFlags?.['read-write-state-assignments']

        // This resolver is only callable by CMS users
        if (!hasCMSPermissions(user)) {
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
        if (
            unlockContractResult.status != 'UNLOCKED' &&
            unlockContractResult.status != 'DRAFT'
        ) {
            const errMessage = `Programming Error: Got incorrect status from an unlocked contract.`
            logError('unlockContract', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new GraphQLError(errMessage, {
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                    cause: 'DB_ERROR',
                },
            })
        }

        let stateAnalystsEmails: string[] = []
        if (readStateAnalystsFromDBFlag) {
            // not great that state code type isn't being used in ContractType but I'll risk the conversion for now
            const stateAnalystsEmailsResult =
                await store.findStateAssignedUsers(
                    contractResult.stateCode as StateCodeType
                )

            if (stateAnalystsEmailsResult instanceof Error) {
                logError(
                    'getStateAnalystsEmails',
                    stateAnalystsEmailsResult.message
                )
                setErrorAttributesOnActiveSpan(
                    stateAnalystsEmailsResult.message,
                    span
                )
            } else {
                stateAnalystsEmails = stateAnalystsEmailsResult.map(
                    (u) => u.email
                )
            }
        } else {
            const stateAnalystsEmailsResult =
                await emailParameterStore.getStateAnalystsEmails(
                    contractResult.stateCode
                )

            //If error log it and set stateAnalystsEmails to empty string as to not interrupt the emails.
            if (stateAnalystsEmailsResult instanceof Error) {
                logError(
                    'getStateAnalystsEmails',
                    stateAnalystsEmailsResult.message
                )
                setErrorAttributesOnActiveSpan(
                    stateAnalystsEmailsResult.message,
                    span
                )
            } else {
                stateAnalystsEmails = stateAnalystsEmailsResult
            }
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
            updatedBy: context.user,
            updatedReason: unlockedReason,
        }

        const unlockContractCMSEmailResult =
            await emailer.sendUnlockContractCMSEmail(
                unlockContractResult,
                updateInfo,
                stateAnalystsEmails,
                statePrograms
            )

        const unlockContractStateEmailResult =
            await emailer.sendUnlockContractStateEmail(
                unlockContractResult,
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
