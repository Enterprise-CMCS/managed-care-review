import { createForbiddenError, createUserInputError } from '../errorUtils'
import type { UpdateInfoType } from '../../domain-models'
import { contractSubmitters, hasCMSPermissions } from '../../domain-models'
import type { Emailer } from '../../emailer'
import type { MutationResolvers } from '../../gen/gqlServer'
import { logResolverError, logResolverSuccess } from '../../logger'
import { NotFoundError } from '../../postgres'
import type { Store } from '../../postgres'
import { withResolverSpan, setResolverDetails } from '../attributeHelper'
import { GraphQLError } from 'graphql'
import { canOauthWrite } from '../../authorization/oauthAuthorization'
import type { StateCodeType } from '@mc-review/submissions'

export function unlockContractResolver(
    store: Store,
    emailer: Emailer
): MutationResolvers['unlockContract'] {
    return async (_parent, { input }, context) => {
        const { user } = context

        return withResolverSpan(
            context,
            'unlockContract',
            { 'mcreview.package_id': input.contractID },
            async (span) => {
                setResolverDetails(span, user)

                const { unlockedReason, contractID } = input

                if (!canOauthWrite(context)) {
                    const errMessage = `OAuth client does not have write permissions`
                    logResolverError('unlockContract', errMessage, context)
                    throw new GraphQLError(errMessage, {
                        extensions: {
                            code: 'FORBIDDEN',
                            cause: 'INSUFFICIENT_OAUTH_GRANTS',
                        },
                    })
                }

                // This resolver is only callable by CMS users
                if (!hasCMSPermissions(user)) {
                    const errMessage = 'user not authorized to unlock contract'
                    logResolverError('unlockContract', errMessage, context)
                    throw createForbiddenError(errMessage)
                }

                const contractResult =
                    await store.findContractWithHistory(contractID)
                if (contractResult instanceof Error) {
                    if (contractResult instanceof NotFoundError) {
                        const errMessage = `A contract must exist to be unlocked: ${contractID}`
                        logResolverError('unlockContract', errMessage, context)
                        throw createUserInputError(errMessage, 'contractID')
                    }

                    const errMessage = `Issue finding a contract. Message: ${contractResult.message}`
                    logResolverError('unlockContract', errMessage, context)
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
                    const errMessage = `Attempted to unlock contract with wrong status: ${contractResult.consolidatedStatus}`
                    logResolverError('unlockContract', errMessage, context)
                    throw createUserInputError(errMessage, 'contractID')
                }

                const unlockContractResult = await store.unlockContract({
                    contractID: contractResult.id,
                    unlockReason: unlockedReason,
                    unlockedByUserID: user.id,
                })
                if (unlockContractResult instanceof Error) {
                    const errMessage = `Failed to unlock contract revision with ID: ${contractResult.id}; ${unlockContractResult.message}`
                    logResolverError('unlockContract', errMessage, context)
                    throw new GraphQLError(errMessage, {
                        extensions: {
                            code: 'INTERNAL_SERVER_ERROR',
                            cause: 'DB_ERROR',
                        },
                    })
                }

                let stateAnalystsEmails: string[] = []
                // not great that state code type isn't being used in ContractType but I'll risk the conversion for now
                const stateAnalystsEmailsResult =
                    await store.findStateAssignedUsers(
                        contractResult.stateCode as StateCodeType
                    )

                if (stateAnalystsEmailsResult instanceof Error) {
                    logResolverError(
                        'getStateAnalystsEmails',
                        stateAnalystsEmailsResult.message,
                        context
                    )
                } else {
                    stateAnalystsEmails = stateAnalystsEmailsResult.map(
                        (u) => u.email
                    )
                }

                // Get submitter email from every pkg submitted revision.
                const submitterEmails = contractSubmitters(unlockContractResult)

                const statePrograms = store.findStatePrograms(
                    unlockContractResult.stateCode
                )

                if (statePrograms instanceof Error) {
                    logResolverError(
                        'findStatePrograms',
                        statePrograms.message,
                        context
                    )
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
                        logResolverError(
                            'unlockContractCMSEmail - CMS email failed',
                            unlockContractCMSEmailResult,
                            context
                        )
                    }
                    if (unlockContractStateEmailResult instanceof Error) {
                        logResolverError(
                            'unlockContractStateEmail - state email failed',
                            unlockContractStateEmailResult,
                            context
                        )
                    }
                    throw new GraphQLError('Email failed.', {
                        extensions: {
                            code: 'INTERNAL_SERVER_ERROR',
                            cause: 'EMAIL_ERROR',
                        },
                    })
                }

                logResolverSuccess('unlockContract', context)

                return { contract: unlockContractResult }
            }
        )
    }
}
