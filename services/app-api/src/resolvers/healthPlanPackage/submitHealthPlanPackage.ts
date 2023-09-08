import { ForbiddenError, UserInputError } from 'apollo-server-lambda'
import {
    hasValidContract,
    hasValidDocuments,
    hasValidRates,
    hasAnyValidRateData,
    isContractAndRates,
    removeRatesData,
    removeInvalidProvisionsAndAuthorities,
    isValidAndCurrentLockedHealthPlanFormData,
    hasValidSupportingDocumentCategories,
    isContractOnly,
    isCHIPOnly,
} from '../../../../app-web/src/common-code/healthPlanFormDataType/healthPlanFormData'
import type { UpdateInfoType, HealthPlanPackageType } from '../../domain-models'
import {
    isStateUser,
    packageStatus,
    packageSubmitters,
} from '../../domain-models'
import type { Emailer } from '../../emailer'
import type { MutationResolvers, State } from '../../gen/gqlServer'
import { logError, logSuccess } from '../../logger'
import type { Store } from '../../postgres'
import { NotFoundError, isStoreError } from '../../postgres'
import {
    setResolverDetailsOnActiveSpan,
    setErrorAttributesOnActiveSpan,
    setSuccessAttributesOnActiveSpan,
} from '../attributeHelper'
import { toDomain } from '../../../../app-web/src/common-code/proto/healthPlanFormDataProto'
import type { EmailParameterStore } from '../../parameterStore'
import { GraphQLError } from 'graphql'

import type {
    HealthPlanFormDataType,
    LockedHealthPlanFormDataType,
} from '../../../../app-web/src/common-code/healthPlanFormDataType'
import type { LDService } from '../../launchDarkly/launchDarkly'
import {
    convertContractWithRatesToFormData,
    convertContractWithRatesToUnlockedHPP,
} from '../../domain-models/contractAndRates/convertContractWithRatesToHPP'
import type { Span } from '@opentelemetry/api'
import type { PackageStatusType } from '../../domain-models/contractAndRates'

export const SubmissionErrorCodes = ['INCOMPLETE', 'INVALID'] as const
type SubmissionErrorCode = (typeof SubmissionErrorCodes)[number] // iterable union type

type SubmissionError = {
    code: SubmissionErrorCode
    message: string
}

export function isSubmissionError(err: unknown): err is SubmissionError {
    if (err && typeof err == 'object') {
        if ('code' in err && 'message' in err) {
            // This seems ugly but necessary in a type guard.
            const hasCode = err as { code: unknown }
            if (typeof hasCode.code === 'string') {
                if (
                    SubmissionErrorCodes.some(
                        (errCode) => hasCode.code === errCode
                    )
                ) {
                    return true
                }
            }
        }
    }
    return false
}

// Throw error if resubmitted without reason or already submitted.
const validateStatusAndUpdateInfo = (
    status: PackageStatusType,
    updateInfo: UpdateInfoType,
    span?: Span,
    submittedReason?: string
) => {
    if (status === 'UNLOCKED' && submittedReason) {
        updateInfo.updatedReason = submittedReason // !destructive - edits the actual update info attached to submission
    } else if (status === 'UNLOCKED' && !submittedReason) {
        const errMessage = 'Resubmission requires a reason'
        logError('submitHealthPlanPackage', errMessage)
        setErrorAttributesOnActiveSpan(errMessage, span)
        throw new UserInputError(errMessage)
    } else if (status === 'RESUBMITTED' || status === 'SUBMITTED') {
        const errMessage = `Attempted to submit an already submitted package.`
        logError('submitHealthPlanPackage', errMessage)
        throw new GraphQLError(errMessage, {
            extensions: {
                code: 'INTERNAL_SERVER_ERROR',
                cause: 'INVALID_PACKAGE_STATUS',
            },
        })
    }
}

// This is a state machine transition to turn an Unlocked to Locked Form Data
// It will return an error if there are any missing fields that are required to submit
// This strategy (returning a different type from validation) is taken from the
// "parse, don't validate" article: https://lexi-lambda.github.io/blog/2019/11/05/parse-don-t-validate/
function submit(
    draft: HealthPlanFormDataType
): LockedHealthPlanFormDataType | SubmissionError {
    const maybeStateSubmission: Record<string, unknown> = {
        ...draft,
        status: 'SUBMITTED',
        submittedAt: new Date(),
    }

    if (isValidAndCurrentLockedHealthPlanFormData(maybeStateSubmission))
        return maybeStateSubmission
    else if (
        !hasValidContract(maybeStateSubmission as LockedHealthPlanFormDataType)
    ) {
        return {
            code: 'INCOMPLETE',
            message: 'formData is missing required contract fields',
        }
    } else if (
        !hasValidRates(maybeStateSubmission as LockedHealthPlanFormDataType)
    ) {
        return isContractAndRates(draft)
            ? {
                  code: 'INCOMPLETE',
                  message: 'formData is missing required rate fields',
              }
            : {
                  code: 'INVALID',
                  message: 'formData includes invalid rate fields',
              }
    } else if (
        !hasValidDocuments(maybeStateSubmission as LockedHealthPlanFormDataType)
    ) {
        return {
            code: 'INCOMPLETE',
            message: 'formData must have valid documents',
        }
    } else if (
        !hasValidSupportingDocumentCategories(
            maybeStateSubmission as LockedHealthPlanFormDataType
        )
    ) {
        return {
            code: 'INCOMPLETE',
            message:
                'formData must have valid categories for supporting documents',
        }
    } else
        return {
            code: 'INCOMPLETE',
            message: 'formData is missing a required field',
        }
}

// submitHealthPlanPackageResolver is a state machine transition for HealthPlanPackage
// All the rate data that comes in in is revisions data. The id on the data is the revision id.
//
export function submitHealthPlanPackageResolver(
    store: Store,
    emailer: Emailer,
    emailParameterStore: EmailParameterStore,
    launchDarkly: LDService
): MutationResolvers['submitHealthPlanPackage'] {
    return async (_parent, { input }, context) => {
        const ratesDatabaseRefactor = await launchDarkly.getFeatureFlag(
            context,
            'rates-db-refactor'
        )
        const { user, span } = context
        const { submittedReason, pkgID } = input
        setResolverDetailsOnActiveSpan('submitHealthPlanPackage', user, span)
        span?.setAttribute('mcreview.package_id', pkgID)

        let currentFormData: HealthPlanFormDataType // data from revision that is being submitted
        let contractRevisionID: string // id for latest contract revision  - this will be passed to submit
        let updatedPackage: HealthPlanPackageType // updated data from revision after submit

        //Set updateInfo default to initial submission
        const updateInfo: UpdateInfoType = {
            updatedAt: new Date(),
            updatedBy: context.user.email,
            updatedReason: 'Initial submission',
        }

        // This resolver is only callable by state users
        if (!isStateUser(user)) {
            logError(
                'submitHealthPlanPackage',
                'user not authorized to fetch state data'
            )
            setErrorAttributesOnActiveSpan(
                'user not authorized to fetch state data',
                span
            )
            throw new ForbiddenError('user not authorized to fetch state data')
        }
        const stateFromCurrentUser: State['code'] = user.stateCode

        if (ratesDatabaseRefactor) {
            // fetch contract and related reates - convert to HealthPlanPackage and proto-ize to match the pattern for flag off\
            // this could be replaced with parsing to locked versus unlocked contracts and rates when types are available
            const contractWithHistory = await store.findContractWithHistory(
                input.pkgID
            )

            if (contractWithHistory instanceof Error) {
                const errMessage = `Issue finding a contract with history with id ${input.pkgID}. Message: ${contractWithHistory.message}`
                logError('fetchHealthPlanPackage', errMessage)
                setErrorAttributesOnActiveSpan(errMessage, span)

                if (contractWithHistory instanceof NotFoundError) {
                    throw new GraphQLError(errMessage, {
                        extensions: {
                            code: 'NOT_FOUND',
                            cause: 'DB_ERROR',
                        },
                    })
                }

                throw new GraphQLError(errMessage, {
                    extensions: {
                        code: 'INTERNAL_SERVER_ERROR',
                        cause: 'DB_ERROR',
                    },
                })
            }

            const maybeHealthPlanPackage =
                convertContractWithRatesToUnlockedHPP(contractWithHistory)

            if (maybeHealthPlanPackage instanceof Error) {
                const errMessage = `Error convert to contractWithHistory health plan package. Message: ${maybeHealthPlanPackage.message}`
                logError('submitHealthPlanPackage', errMessage)
                setErrorAttributesOnActiveSpan(errMessage, span)
                throw new GraphQLError(errMessage, {
                    extensions: {
                        code: 'INTERNAL_SERVER_ERROR',
                        cause: 'PROTO_DECODE_ERROR',
                    },
                })
            }

            // Validate user authorized to fetch state
            if (contractWithHistory.stateCode !== stateFromCurrentUser) {
                logError(
                    'submitHealthPlanPackage',
                    'user not authorized to fetch data from a different state'
                )
                setErrorAttributesOnActiveSpan(
                    'user not authorized to fetch data from a different state',
                    span
                )
                throw new ForbiddenError(
                    'user not authorized to fetch data from a different state'
                )
            }

            validateStatusAndUpdateInfo(
                contractWithHistory.status,
                updateInfo,
                span,
                submittedReason || undefined
            )

            // reassign variable set up before rates feature flag
            currentFormData = convertContractWithRatesToFormData(
                contractWithHistory.revisions[0],
                contractWithHistory.stateCode,
                contractWithHistory.stateNumber
            )
            contractRevisionID = contractWithHistory.revisions[0].id
        } else {
            //  fetch from package flag off - returns HealthPlanPackage
            const initialPackage = await store.findHealthPlanPackage(
                input.pkgID
            )

            if (isStoreError(initialPackage) || !initialPackage) {
                if (!initialPackage) {
                    throw new GraphQLError('Issue finding package.', {
                        extensions: {
                            code: 'NOT_FOUND',
                            cause: 'DB_ERROR',
                        },
                    })
                }
                const errMessage = `Issue finding a package of type ${initialPackage.code}. Message: ${initialPackage.message}`
                logError('submitHealthPlanPackage', errMessage)
                setErrorAttributesOnActiveSpan(errMessage, span)
                throw new GraphQLError(errMessage, {
                    extensions: {
                        code: 'INTERNAL_SERVER_ERROR',
                        cause: 'DB_ERROR',
                    },
                })
            }

            // unwrap HealthPlanPackage again to make further edits to data
            const maybeFormData = toDomain(
                initialPackage.revisions[0].formDataProto
            )
            if (maybeFormData instanceof Error) {
                const errMessage = `Failed to decode draft proto ${maybeFormData}.`
                logError('submitHealthPlanPackage', errMessage)
                throw new GraphQLError(errMessage, {
                    extensions: {
                        code: 'INTERNAL_SERVER_ERROR',
                        cause: 'PROTO_DECODE_ERROR',
                    },
                })
            }

            // Validate user authorized to fetch state
            if (initialPackage.stateCode !== stateFromCurrentUser) {
                logError(
                    'submitHealthPlanPackage',
                    'user not authorized to fetch data from a different state'
                )
                setErrorAttributesOnActiveSpan(
                    'user not authorized to fetch data from a different state',
                    span
                )
                throw new ForbiddenError(
                    'user not authorized to fetch data from a different state'
                )
            }
            const status = packageStatus(initialPackage)
            if (status instanceof Error) {
                throw new GraphQLError(status.message, {
                    extensions: {
                        code: 'INTERNAL_SERVER_ERROR',
                        cause: 'INVALID_PACKAGE_STATUS',
                    },
                })
            }

            validateStatusAndUpdateInfo(
                status,
                updateInfo,
                span,
                submittedReason || undefined
            )
            // reassign variable set up before rates feature flag
            currentFormData = maybeFormData
            contractRevisionID = initialPackage.revisions[0].id
        }

        /*
             Clean form data and remove fields from edits on irrelevant logic branches
                - CONTRACT_ONLY submission type should not contain any CONTRACT_AND_RATE rates data.
                - CHIP_ONLY population covered should not contain any provision or authority relevant to other population.
                - We delete at submission instead of update to preserve rates data in case user did not intend or would like to revert the submission type before submitting.
           */

        if (
            isContractOnly(currentFormData) &&
            hasAnyValidRateData(currentFormData)
        ) {
            Object.assign(currentFormData, removeRatesData(currentFormData))
        }
        if (isCHIPOnly(currentFormData)) {
            Object.assign(
                currentFormData,
                removeInvalidProvisionsAndAuthorities(currentFormData)
            )
        }

        /*
        Final check of data before submit - Parse to state submission
        */
        const submissionResult = submit(currentFormData)

        if (isSubmissionError(submissionResult)) {
            const errMessage = submissionResult.message
            logError('submitHealthPlanPackage', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new UserInputError(errMessage, {
                message: submissionResult.message,
            })
        }

        const lockedFormData = submissionResult

        if (ratesDatabaseRefactor) {
            // Save the contract!
            const submitResult = await store.submitContract({
                contractID: contractRevisionID,
                submittedByUserID: user.id,
                submitReason: updateInfo.updatedReason,
            })
            if (isStoreError(submitResult)) {
                const errMessage = `Issue updating a package of type ${submitResult.code}. Message: ${submitResult.message}`
                logError('submitHealthPlanPackage', errMessage)
                setErrorAttributesOnActiveSpan(errMessage, span)
                throw new GraphQLError(errMessage, {
                    extensions: {
                        code: 'INTERNAL_SERVER_ERROR',
                        cause: 'DB_ERROR',
                    },
                })
            } else if (submitResult instanceof Error) {
                throw new Error('Still to do - figuring out error handling')
            }
            const maybeSubmittedPkg =
                convertContractWithRatesToUnlockedHPP(submitResult)

            if (maybeSubmittedPkg instanceof Error) {
                const errMessage = `Error converting draft contract. Message: ${maybeSubmittedPkg.message}`
                logError('createHealthPlanPackage', errMessage)
                setErrorAttributesOnActiveSpan(errMessage, span)
                throw new GraphQLError(errMessage, {
                    extensions: {
                        code: 'INTERNAL_SERVER_ERROR',
                        cause: 'PROTO_DECODE_ERROR',
                    },
                })
            }

            updatedPackage = maybeSubmittedPkg
        } else {
            // Save the package!
            const updateResult = await store.updateHealthPlanRevision(
                input.pkgID,
                contractRevisionID,
                lockedFormData,
                updateInfo
            )
            if (isStoreError(updateResult)) {
                const errMessage = `Issue updating a package of type ${updateResult.code}. Message: ${updateResult.message}`
                logError('submitHealthPlanPackage', errMessage)
                setErrorAttributesOnActiveSpan(errMessage, span)
                throw new GraphQLError(errMessage, {
                    extensions: {
                        code: 'INTERNAL_SERVER_ERROR',
                        cause: 'DB_ERROR',
                    },
                })
            }

            updatedPackage = updateResult
        }

        // Send emails!
        const status = packageStatus(updatedPackage)
        // Get state analysts emails from parameter store
        let stateAnalystsEmails =
            await emailParameterStore.getStateAnalystsEmails(
                updatedPackage.stateCode
            )
        //If error log it and set stateAnalystsEmails to empty string as to not interrupt the emails.
        if (stateAnalystsEmails instanceof Error) {
            logError('getStateAnalystsEmails', stateAnalystsEmails.message)
            setErrorAttributesOnActiveSpan(stateAnalystsEmails.message, span)
            stateAnalystsEmails = []
        }

        // Get submitter email from every pkg submitted revision.
        const submitterEmails = packageSubmitters(updatedPackage)

        const statePrograms = store.findStatePrograms(updatedPackage.stateCode)

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

        let cmsPackageEmailResult
        let statePackageEmailResult

        if (status === 'RESUBMITTED') {
            logSuccess('It was resubmitted')
            cmsPackageEmailResult = await emailer.sendResubmittedCMSEmail(
                lockedFormData,
                updateInfo,
                stateAnalystsEmails,
                statePrograms
            )
            statePackageEmailResult = await emailer.sendResubmittedStateEmail(
                lockedFormData,
                updateInfo,
                submitterEmails,
                statePrograms
            )
        } else if (status === 'SUBMITTED') {
            cmsPackageEmailResult = await emailer.sendCMSNewPackage(
                lockedFormData,
                stateAnalystsEmails,
                statePrograms
            )
            statePackageEmailResult = await emailer.sendStateNewPackage(
                lockedFormData,
                submitterEmails,
                statePrograms
            )
        }

        if (
            cmsPackageEmailResult instanceof Error ||
            statePackageEmailResult instanceof Error
        ) {
            if (cmsPackageEmailResult instanceof Error) {
                logError(
                    'submitHealthPlanPackage - CMS email failed',
                    cmsPackageEmailResult
                )
                setErrorAttributesOnActiveSpan('CMS email failed', span)
            }
            if (statePackageEmailResult instanceof Error) {
                logError(
                    'submitHealthPlanPackage - state email failed',
                    statePackageEmailResult
                )
                setErrorAttributesOnActiveSpan('state email failed', span)
            }
            throw new GraphQLError('Email failed', {
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                    cause: 'EMAIL_ERROR',
                },
            })
        }

        logSuccess('submitHealthPlanPackage')
        setSuccessAttributesOnActiveSpan(span)
        return { pkg: updatedPackage }
    }
}
