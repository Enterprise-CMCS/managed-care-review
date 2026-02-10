import { createForbiddenError, createUserInputError } from '../errorUtils'
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
import { GraphQLError } from 'graphql'
import { canWrite } from '../../authorization/oauthAuthorization'
import type { StateCodeType } from '@mc-review/submissions'

export function unlockContractResolver(
    store: Store,
    emailer: Emailer
): MutationResolvers['unlockContract'] {
    return async (_parent, { input }, context) => {
        const { user, ctx, tracer } = context
        const span = tracer?.startSpan('unlockContract', {}, ctx)
        setResolverDetailsOnActiveSpan('unlockContract', user, span)

        const { unlockedReason, contractID } = input
        span?.setAttribute('mcreview.package_id', contractID)

        if (!canWrite(context)) {
            const errMessage = `OAuth client does not have write permissions`
            logError('unlockContract', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)

            throw new GraphQLError(errMessage, {
                extensions: {
                    code: 'FORBIDDEN',
                    cause: 'INSUFFICIENT_OAUTH_GRANTS',
                },
            })
        }

        // This resolver is only callable by CMS users
        if (!hasCMSPermissions(user)) {
            logError('unlockContract', 'user not authorized to unlock contract')
            setErrorAttributesOnActiveSpan(
                'user not authorized to unlock contract',
                span
            )
            throw createForbiddenError('user not authorized to unlock contract')
        }

        const contractResult = await store.findContractWithHistory(contractID)
        if (contractResult instanceof Error) {
            if (contractResult instanceof NotFoundError) {
                const errMessage = `A contract must exist to be unlocked: ${contractID}`
                logError('unlockContract', errMessage)
                setErrorAttributesOnActiveSpan(errMessage, span)
                throw createUserInputError(errMessage, 'contractID')
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

        if (
            contractResult.draftRevision ||
            contractResult.consolidatedStatus === 'APPROVED'
        ) {
            const errMessage = `Attempted to unlock contract with wrong status`
            logError('unlockContract', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw createUserInputError(errMessage, 'contractID')
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

        let stateAnalystsEmails: string[] = []
        // not great that state code type isn't being used in ContractType but I'll risk the conversion for now
        const stateAnalystsEmailsResult = await store.findStateAssignedUsers(
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
            stateAnalystsEmails = stateAnalystsEmailsResult.map((u) => u.email)
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

        if (unlockContractResult.contractSubmissionType === 'HEALTH_PLAN') {
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
        } else {
            const unlockEQROStateEmailResult =
                await emailer.sendUnlockEQROStateEmail(
                    unlockContractResult,
                    updateInfo,
                    statePrograms,
                    submitterEmails
                )

            if (unlockEQROStateEmailResult instanceof Error) {
                logError(
                    'unlockEQROStateEmail - state email failed',
                    unlockEQROStateEmailResult
                )
                setErrorAttributesOnActiveSpan('state email failed', span)

                throw new GraphQLError('Email failed.', {
                    extensions: {
                        code: 'INTERNAL_SERVER_ERROR',
                        cause: 'EMAIL_ERROR',
                    },
                })
            }
        }

        logSuccess('unlockContract')
        setSuccessAttributesOnActiveSpan(span)

        return { contract: unlockContractResult }
    }
}
