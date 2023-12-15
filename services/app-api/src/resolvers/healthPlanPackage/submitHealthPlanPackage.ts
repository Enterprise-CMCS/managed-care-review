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
    isContractOnly,
    isCHIPOnly,
} from '../../../../app-web/src/common-code/healthPlanFormDataType/healthPlanFormData'
import type { UpdateInfoType } from '../../domain-models'
import {
    isStateUser,
    packageStatus,
    packageSubmitters,
} from '../../domain-models'
import type { Emailer } from '../../emailer'
import type { MutationResolvers, State } from '../../gen/gqlServer'
import { logError, logSuccess } from '../../logger'
import type { Store } from '../../postgres'
import { NotFoundError } from '../../postgres'
import {
    setResolverDetailsOnActiveSpan,
    setErrorAttributesOnActiveSpan,
    setSuccessAttributesOnActiveSpan,
} from '../attributeHelper'
import type { EmailParameterStore } from '../../parameterStore'
import { GraphQLError } from 'graphql'

import type {
    HealthPlanFormDataType,
    LockedHealthPlanFormDataType,
} from '../../../../app-web/src/common-code/healthPlanFormDataType'
import type {
    FeatureFlagSettings,
    LDService,
} from '../../launchDarkly/launchDarkly'
import {
    convertContractWithRatesToFormData,
    convertContractWithRatesToUnlockedHPP,
} from '../../domain-models/contractAndRates/convertContractWithRatesToHPP'
import type { Span } from '@opentelemetry/api'
import type {
    PackageStatusType,
    RateType,
} from '../../domain-models/contractAndRates'
import type { RateFormEditable } from '../../postgres/contractAndRates/updateDraftRate'

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
export function parseAndSubmit(
    draft: HealthPlanFormDataType,
    featureFlag?: FeatureFlagSettings
): LockedHealthPlanFormDataType | SubmissionError {
    // Remove fields from edits on irrelevant logic branches
    //  - CONTRACT_ONLY submission type should not contain any CONTRACT_AND_RATE rates data.
    // - CHIP_ONLY population covered should not contain any provision or authority relevant to other population.
    // - We delete at submission instead of update to preserve rates data in case user did not intend or would like to revert the submission type before submitting.
    if (isContractOnly(draft) && hasAnyValidRateData(draft)) {
        Object.assign(draft, removeRatesData(draft))
    }
    if (isCHIPOnly(draft)) {
        Object.assign(draft, removeInvalidProvisionsAndAuthorities(draft))
    }

    const maybeStateSubmission: Record<string, unknown> = {
        ...draft,
        status: 'SUBMITTED',
        submittedAt: new Date(),
    }

    const hasValid438Attestation =
        featureFlag?.['438-attestation'] === false
            ? true
            : draft.statutoryRegulatoryAttestation ||
              (draft.statutoryRegulatoryAttestation === false &&
                  draft.statutoryRegulatoryAttestationDescription)

    if (
        isValidAndCurrentLockedHealthPlanFormData(maybeStateSubmission) &&
        hasValid438Attestation
    ) {
        return maybeStateSubmission
    } else if (
        !hasValidContract(
            maybeStateSubmission as LockedHealthPlanFormDataType
        ) ||
        !hasValid438Attestation
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
        const featureFlags = await launchDarkly.allFlags(context)

        const { user, span } = context
        const { submittedReason, pkgID } = input
        setResolverDetailsOnActiveSpan('submitHealthPlanPackage', user, span)
        span?.setAttribute('mcreview.package_id', pkgID)

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

        if (!contractWithHistory.draftRevision) {
            throw new Error(
                'PROGRAMMING ERROR: Status should not be submittable without a draft revision'
            )
        }

        // reassign variable set up before rates feature flag
        const conversionResult = convertContractWithRatesToFormData(
            contractWithHistory.draftRevision,
            contractWithHistory.id,
            contractWithHistory.stateCode,
            contractWithHistory.stateNumber
        )

        if (conversionResult instanceof Error) {
            const errMessage = conversionResult.message
            logError('submitHealthPlanPackage', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new Error(errMessage)
        }

        const initialFormData = conversionResult
        const contractRevisionID = contractWithHistory.draftRevision.id

        // Final clean + check of data before submit - parse to state submission
        const maybeLocked = parseAndSubmit(initialFormData, featureFlags)

        if (isSubmissionError(maybeLocked)) {
            const errMessage = maybeLocked.message
            logError('submitHealthPlanPackage', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new UserInputError(errMessage, {
                message: maybeLocked.message,
            })
        }

        // Since submit can change the form data, we have to save it again.
        // if the rates were removed, we remove them.
        let removeRateInfos: RateFormEditable[] | undefined = undefined
        if (maybeLocked.rateInfos.length === 0) {
            // undefined means ignore rates in updaterDraftContractWithRates, empty array means empty them.
            removeRateInfos = []
        }

        const updateResult = await store.updateDraftContractWithRates({
            contractID: input.pkgID,
            formData: {
                ...maybeLocked,
                ...maybeLocked.contractAmendmentInfo?.modifiedProvisions,
                managedCareEntities: maybeLocked.managedCareEntities,
                stateContacts: maybeLocked.stateContacts,
                supportingDocuments: maybeLocked.documents.map((doc) => {
                    return {
                        name: doc.name,
                        s3URL: doc.s3URL,
                        sha256: doc.sha256,
                        id: doc.id,
                    }
                }),
                contractDocuments: maybeLocked.contractDocuments.map((doc) => {
                    return {
                        name: doc.name,
                        s3URL: doc.s3URL,
                        sha256: doc.sha256,
                        id: doc.id,
                    }
                }),
            },
            rateFormDatas: removeRateInfos,
        })
        if (updateResult instanceof Error) {
            const errMessage = `Failed to update submitted contract info with ID: ${contractRevisionID}; ${updateResult.message}`
            logError('submitHealthPlanPackage', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new GraphQLError(errMessage, {
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                    cause: 'DB_ERROR',
                },
            })
        }

        if (!updateResult.draftRevision) {
            throw new Error(
                'PROGRAMMING ERROR: draft contract does not contain a draft revision'
            )
        }

        // From this point forward we use updateResult instead of contractWithHistory because it is now old data.

        // If there are rates, submit those first
        if (updateResult.draftRevision.rateRevisions.length > 0) {
            const ratePromises: Promise<Error | RateType>[] = []
            updateResult.draftRevision.rateRevisions.forEach((rateRev) => {
                ratePromises.push(
                    store.submitRate({
                        rateRevisionID: rateRev.id,
                        submittedByUserID: user.id,
                        submitReason: updateInfo.updatedReason,
                    })
                )
            })

            const submitRatesResult = await Promise.all(ratePromises)
            // if any of the promises reject, which shouldn't happen b/c we don't throw...
            if (submitRatesResult instanceof Error) {
                const errMessage = `Failed to submit contract revision's rates with ID: ${contractRevisionID}; ${submitRatesResult.message}`
                logError('submitHealthPlanPackage', errMessage)
                setErrorAttributesOnActiveSpan(errMessage, span)
                throw new GraphQLError(errMessage, {
                    extensions: {
                        code: 'INTERNAL_SERVER_ERROR',
                        cause: 'DB_ERROR',
                    },
                })
            }
            const submitRateErrors: Error[] = submitRatesResult.filter(
                (res) => res instanceof Error
            ) as Error[]
            if (submitRateErrors.length > 0) {
                console.error('Errors submitting Rates: ', submitRateErrors)
                const errMessage = `Failed to submit contract revision's rates with ID: ${contractRevisionID}; ${submitRateErrors.map(
                    (err) => err.message
                )}`
                logError('submitHealthPlanPackage', errMessage)
                setErrorAttributesOnActiveSpan(errMessage, span)
                throw new GraphQLError(errMessage, {
                    extensions: {
                        code: 'INTERNAL_SERVER_ERROR',
                        cause: 'DB_ERROR',
                    },
                })
            }
        }

        // then submit the contract!
        const submitContractResult = await store.submitContract({
            contractID: updateResult.id,
            submittedByUserID: user.id,
            submitReason: updateInfo.updatedReason,
        })
        if (submitContractResult instanceof Error) {
            const errMessage = `Failed to submit contract revision with ID: ${contractRevisionID}; ${submitContractResult.message}`
            logError('submitHealthPlanPackage', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new GraphQLError(errMessage, {
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                    cause: 'DB_ERROR',
                },
            })
        }
        const maybeSubmittedPkg =
            convertContractWithRatesToUnlockedHPP(submitContractResult)

        if (maybeSubmittedPkg instanceof Error) {
            const errMessage = `Error converting draft contract. Message: ${maybeSubmittedPkg.message}`
            logError('submitHealthPlanPackage', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new GraphQLError(errMessage, {
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                    cause: 'PROTO_DECODE_ERROR',
                },
            })
        }

        // set variables used across feature flag boundary
        const lockedFormData = maybeLocked
        const updatedPackage = maybeSubmittedPkg

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
