import { ForbiddenError, UserInputError } from 'apollo-server-lambda'
import type { UnlockedHealthPlanFormDataType } from '../../../../app-web/src/common-code/healthPlanFormDataType'
import { toDomain } from '../../../../app-web/src/common-code/proto/healthPlanFormDataProto'
import type { UpdateInfoType, ContractType } from '../../domain-models'
import {
    isCMSUser,
    convertContractWithRatesToUnlockedHPP,
    packageSubmitters,
} from '../../domain-models'
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

// unlockHealthPlanPackageResolver is a state machine transition for HealthPlanPackage
export function unlockHealthPlanPackageResolver(
    store: Store,
    emailer: Emailer,
    emailParameterStore: EmailParameterStore,
    launchDarkly: LDService
): MutationResolvers['unlockHealthPlanPackage'] {
    return async (_parent, { input }, context) => {
        const { user, ctx, tracer } = context
        const span = tracer?.startSpan('unlockHealthPlanPackage', {}, ctx)
        setResolverDetailsOnActiveSpan('unlockHealthPlanPackage', user, span)

        const { unlockedReason, pkgID } = input
        span?.setAttribute('mcreview.package_id', pkgID)

        const featureFlags = await launchDarkly.allFlags(context)
        const linkRatesFF = featureFlags?.['link-rates'] === true

        // This resolver is only callable by CMS users
        if (!isCMSUser(user)) {
            logError(
                'unlockHealthPlanPackage',
                'user not authorized to unlock package'
            )
            setErrorAttributesOnActiveSpan(
                'user not authorized to unlock package',
                span
            )
            throw new ForbiddenError('user not authorized to unlock package')
        }

        const contractResult = await store.findContractWithHistory(pkgID)

        if (contractResult instanceof Error) {
            if (contractResult instanceof NotFoundError) {
                const errMessage = `A package must exist to be unlocked: ${pkgID}`
                logError('unlockHealthPlanPackage', errMessage)
                setErrorAttributesOnActiveSpan(errMessage, span)
                throw new UserInputError(errMessage, {
                    argumentName: 'pkgID',
                })
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
            throw new UserInputError(errMessage, {
                argumentName: 'pkgID',
                cause: 'INVALID_PACKAGE_STATUS',
            })
        }

        // Now, unlock the contract!
        const unlockContractResult = await store.unlockContract(
            {
                contractID: contract.id,
                unlockReason: unlockedReason,
                unlockedByUserID: user.id,
            },
            linkRatesFF
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

        // Get state analysts emails from parameter store
        let stateAnalystsEmails =
            await emailParameterStore.getStateAnalystsEmails(
                draftformData.stateCode
            )
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
            updatedBy: context.user.email,
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
