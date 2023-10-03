import { ForbiddenError, UserInputError } from 'apollo-server-lambda'
import type {
    UnlockedHealthPlanFormDataType,
    LockedHealthPlanFormDataType,
} from '../../../../app-web/src/common-code/healthPlanFormDataType'
import { toDomain } from '../../../../app-web/src/common-code/proto/healthPlanFormDataProto'
import type {
    UpdateInfoType,
    HealthPlanPackageType,
    ContractType,
} from '../../domain-models'
import {
    isCMSUser,
    convertContractWithRatesToUnlockedHPP,
    packageStatus,
    packageSubmitters,
} from '../../domain-models'
import type { Emailer } from '../../emailer'
import type { MutationResolvers } from '../../gen/gqlServer'
import { logError, logSuccess } from '../../logger'
import { NotFoundError } from '../../postgres'
import type { Store } from '../../postgres'
import { isStoreError } from '../../postgres'
import {
    setErrorAttributesOnActiveSpan,
    setResolverDetailsOnActiveSpan,
    setSuccessAttributesOnActiveSpan,
} from '../attributeHelper'
import type { EmailParameterStore } from '../../parameterStore'
import { GraphQLError } from 'graphql'
import type { LDService } from '../../launchDarkly/launchDarkly'

// unlock is a state machine transforming a LockedFormData and turning it into UnlockedFormData
// Since Unlocked is a strict subset of Locked, this can't error today.
function unlock(
    submission: LockedHealthPlanFormDataType
): UnlockedHealthPlanFormDataType {
    const draft: UnlockedHealthPlanFormDataType = {
        ...submission,
        status: 'DRAFT',
    }
    // this method does persist the submittedAt field onto the draft, but typescript won't let
    // us access it so that's fine.

    return draft
}

// unlockHealthPlanPackageResolver is a state machine transition for HealthPlanPackage
export function unlockHealthPlanPackageResolver(
    store: Store,
    emailer: Emailer,
    emailParameterStore: EmailParameterStore,
    launchDarkly: LDService
): MutationResolvers['unlockHealthPlanPackage'] {
    return async (_parent, { input }, context) => {
        const ratesDatabaseRefactor = await launchDarkly.getFeatureFlag(
            context,
            'rates-db-refactor'
        )

        const { user, span } = context
        const { unlockedReason, pkgID } = input
        setResolverDetailsOnActiveSpan('unlockHealthPlanPackage', user, span)
        span?.setAttribute('mcreview.package_id', pkgID)

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

        let unlockedPackage: HealthPlanPackageType | undefined = undefined

        if (ratesDatabaseRefactor) {
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

            // unlock all the revisions, then unlock the contract, in a transaction.
            const currentRateRevIDs = contract.revisions[0].rateRevisions.map(
                (rr) => rr.id
            )
            const unlockRatePromises = []
            for (const rateRevisionID of currentRateRevIDs) {
                const resPromise = store.unlockRate({
                    rateRevisionID,
                    unlockReason: unlockedReason,
                    unlockedByUserID: user.id,
                })

                unlockRatePromises.push(resPromise)
            }

            const unlockRateResults = await Promise.all(unlockRatePromises)
            // if any of the promises reject, which shouldn't happen b/c we don't throw...
            if (unlockRateResults instanceof Error) {
                const errMessage = `Failed to unlock contract rates with ID: ${contract.id}; ${unlockRateResults.message}`
                logError('unlockHealthPlanPackage', errMessage)
                setErrorAttributesOnActiveSpan(errMessage, span)
                throw new GraphQLError(errMessage, {
                    extensions: {
                        code: 'INTERNAL_SERVER_ERROR',
                        cause: 'DB_ERROR',
                    },
                })
            }

            const unlockRateErrors: Error[] = unlockRateResults.filter(
                (res) => res instanceof Error
            ) as Error[]
            if (unlockRateErrors.length > 0) {
                console.error('Errors unlocking Rates: ', unlockRateErrors)
                const errMessage = `Failed to submit contract revision's rates with ID: ${
                    contract.id
                }; ${unlockRateErrors.map((err) => err.message)}`
                logError('unlockHealthPlanPackage', errMessage)
                setErrorAttributesOnActiveSpan(errMessage, span)
                throw new GraphQLError(errMessage, {
                    extensions: {
                        code: 'INTERNAL_SERVER_ERROR',
                        cause: 'DB_ERROR',
                    },
                })
            }

            // Now, unlock the contract!
            const unlockContractResult = await store.unlockContract({
                contractID: contract.id,
                unlockReason: unlockedReason,
                unlockedByUserID: user.id,
            })
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
            unlockedPackage = unlockedPKGResult
        } else {
            // pre-rates refactor code path
            // fetch from the store
            const result = await store.findHealthPlanPackage(pkgID)

            if (isStoreError(result)) {
                const errMessage = `Issue finding a package of type ${result.code}. Message: ${result.message}`
                logError('unlockHealthPlanPackage', errMessage)
                setErrorAttributesOnActiveSpan(errMessage, span)
                throw new GraphQLError(errMessage, {
                    extensions: {
                        code: 'INTERNAL_SERVER_ERROR',
                        cause: 'DB_ERROR',
                    },
                })
            }

            if (result === undefined) {
                const errMessage = `A package must exist to be unlocked: ${pkgID}`
                logError('unlockHealthPlanPackage', errMessage)
                setErrorAttributesOnActiveSpan(errMessage, span)
                throw new UserInputError(errMessage, {
                    argumentName: 'pkgID',
                })
            }

            const pkg: HealthPlanPackageType = result
            const pkgStatus = packageStatus(pkg)
            const currentRevision = pkg.revisions[0]

            // Check that the package is in an unlockable state
            if (pkgStatus === 'UNLOCKED' || pkgStatus === 'DRAFT') {
                const errMessage =
                    'Attempted to unlock package with wrong status'
                logError('unlockHealthPlanPackage', errMessage)
                setErrorAttributesOnActiveSpan(errMessage, span)
                throw new UserInputError(errMessage, {
                    argumentName: 'pkgID',
                    cause: 'INVALID_PACKAGE_STATUS',
                })
            }

            // pull the current revision out to unlock it.
            const formDataResult = toDomain(currentRevision.formDataProto)
            if (formDataResult instanceof Error) {
                const errMessage = `Failed to decode proto ${formDataResult}.`
                logError('unlockHealthPlanPackage', errMessage)
                throw new GraphQLError(errMessage, {
                    extensions: {
                        code: 'INTERNAL_SERVER_ERROR',
                        cause: 'PROTO_DECODE_ERROR',
                    },
                })
            }

            if (formDataResult.status !== 'SUBMITTED') {
                const errMessage = `A locked package had unlocked formData.`
                logError('unlockHealthPlanPackage', errMessage)
                throw new GraphQLError(errMessage, {
                    extensions: {
                        code: 'INTERNAL_SERVER_ERROR',
                        cause: 'INVALID_PACKAGE_STATUS',
                    },
                })
            }

            const draftformData: UnlockedHealthPlanFormDataType =
                unlock(formDataResult)

            // Create a new revision with this draft in it
            const updateInfo: UpdateInfoType = {
                updatedAt: new Date(),
                updatedBy: context.user.email,
                updatedReason: unlockedReason,
            }

            const unlockedPkg = await store.insertHealthPlanRevision(
                pkgID,
                updateInfo,
                draftformData
            )

            if (isStoreError(unlockedPkg)) {
                const errMessage = `Issue unlocking a package of type ${unlockedPkg.code}. Message: ${unlockedPkg.message}`
                logError('unlockHealthPlanPackage', errMessage)
                setErrorAttributesOnActiveSpan(errMessage, span)
                throw new GraphQLError(errMessage, {
                    extensions: {
                        code: 'INTERNAL_SERVER_ERROR',
                        cause: 'DB_ERROR',
                    },
                })
            }

            unlockedPackage = unlockedPkg
        }

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
