import { createForbiddenError, createUserInputError } from '../errorUtils'
import type { UnlockedHealthPlanFormDataType } from '@mc-review/hpp'
import { toDomain } from '@mc-review/hpp'
import type { UpdateInfoType, ContractType } from '../../domain-models'
import {
    convertContractWithRatesToUnlockedHPP,
    packageSubmitters,
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
import type { StateCodeType } from '@mc-review/hpp'

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

        const draftformData: UnlockedHealthPlanFormDataType = formDataResult

        let stateAnalystsEmails: string[] = []
        // not great that state code type isn't being used in ContractType but I'll risk the conversion for now
        const stateAnalystsEmailsResult = await store.findStateAssignedUsers(
            unlockContractResult.stateCode as StateCodeType
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

        //If error, log it and set stateAnalystsEmails to empty string as to not interrupt the emails.
        if (stateAnalystsEmails instanceof Error) {
            logError('getStateAnalystsEmails', stateAnalystsEmails.message)
            setErrorAttributesOnActiveSpan(stateAnalystsEmails.message, span)
            stateAnalystsEmails = []
        }

        // Get submitter email from every pkg submitted revision.
        const submitterEmails = packageSubmitters(unlockedPackage)

        const statePrograms = store.findStatePrograms(draftformData.stateCode)

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

        const unlockPackageCMSEmailResult =
            await emailer.sendUnlockPackageCMSEmail(
                draftformData,
                updateInfo,
                stateAnalystsEmails,
                statePrograms
            )

        const unlockPackageStateEmailResult =
            await emailer.sendUnlockPackageStateEmail(
                draftformData,
                updateInfo,
                statePrograms,
                submitterEmails
            )

        if (
            unlockPackageCMSEmailResult instanceof Error ||
            unlockPackageStateEmailResult instanceof Error
        ) {
            if (unlockPackageCMSEmailResult instanceof Error) {
                logError(
                    'unlockPackageCMSEmail - CMS email failed',
                    unlockPackageCMSEmailResult
                )
                setErrorAttributesOnActiveSpan('CMS email failed', span)
            }
            if (unlockPackageStateEmailResult instanceof Error) {
                logError(
                    'unlockPackageStateEmail - state email failed',
                    unlockPackageStateEmailResult
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

        logSuccess('unlockHealthPlanPackage')
        setSuccessAttributesOnActiveSpan(span)

        return { pkg: unlockedPackage }
    }
}
