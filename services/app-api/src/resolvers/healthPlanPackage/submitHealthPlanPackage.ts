import { ForbiddenError, UserInputError } from 'apollo-server-lambda'
import {
    hasValidContract,
    hasValidDocuments,
    hasValidRates,
    isContractAndRates,
    removeRatesData,
    removeInvalidProvisionsAndAuthorities,
    isValidAndCurrentLockedHealthPlanFormData,
    isContractOnly,
    isCHIPOnly,
} from '../../common-code/healthPlanFormDataType/healthPlanFormData'
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
    StateCodeType,
} from '../../common-code/healthPlanFormDataType'
import type {
    FeatureFlagSettings,
    LDService,
} from '../../launchDarkly/launchDarkly'
import {
    convertContractToDraftRateRevisions,
    convertContractWithRatesToFormData,
    convertContractWithRatesToUnlockedHPP,
} from '../../domain-models/contractAndRates/convertContractWithRatesToHPP'
import type { Span } from '@opentelemetry/api'
import type { PackageStatusType } from '../../domain-models/contractAndRates'
import type { UpdateDraftContractRatesArgsType } from '../../postgres/contractAndRates/updateDraftContractRates'

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
    draftWithoutLinkedRates: HealthPlanFormDataType, // need this type for validations - HPP type doesnt understand linked rates  but we need to skip validations for them in some cases
    featureFlag?: FeatureFlagSettings
): LockedHealthPlanFormDataType | SubmissionError {
    // Remove fields from edits on irrelevant logic branches
    //  - CONTRACT_ONLY submission type should not contain any CONTRACT_AND_RATE rates data.
    // - CHIP_ONLY population covered should not contain any provision or authority relevant to other population.
    // - We delete at submission instead of update to preserve rates data in case user did not intend or would like to revert the submission type before submitting.
    if (isContractOnly(draft)) {
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

    const maybeStateSubmissionNoLinkedRates: Record<string, unknown> = {
        ...draftWithoutLinkedRates,
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
        isValidAndCurrentLockedHealthPlanFormData(
            maybeStateSubmissionNoLinkedRates
        ) &&
        hasValid438Attestation
    ) {
        return maybeStateSubmission as LockedHealthPlanFormDataType
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
        (maybeStateSubmission as LockedHealthPlanFormDataType).rateInfos
            .length == 0 &&
        isContractAndRates(draft)
    ) {
        return {
            code: 'INCOMPLETE',
            message: 'formData includes invalid rate fields',
        }
    } else if (
        !hasValidRates(
            maybeStateSubmissionNoLinkedRates as LockedHealthPlanFormDataType
        ) &&
        isContractAndRates(draft)
    ) {
        return {
            code: 'INCOMPLETE',
            message: 'formData is missing required rate fields',
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
        const readStateAnalystsFromDBFlag =
            featureFlags?.['read-write-state-assignments']

        const { user, ctx, tracer } = context
        const span = tracer?.startSpan('submitHealthPlanPackage', {}, ctx)
        setResolverDetailsOnActiveSpan('submitHealthPlanPackage', user, span)

        const { submittedReason, pkgID } = input
        span?.setAttribute('mcreview.package_id', pkgID)

        //Set updateInfo default to initial submission
        const updateInfo: UpdateInfoType = {
            updatedAt: new Date(),
            updatedBy: context.user,
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
            convertContractToDraftRateRevisions(contractWithHistory),
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
//////////////////////////////////////
        const initialFormData = conversionResult
        const contractRevisionID = contractWithHistory.draftRevision.id

        // Clear out linked rates form initial data before parse and submit. We should not validate on the linked rates at all (besides there being at least one rate)
        const childRateIDs =
            contractWithHistory.draftRates?.reduce<string[]>(
                (rateIDs, rate) => {
                    if (
                        rate.id &&
                        rate.parentContractID === contractWithHistory.id
                    ) {
                        rateIDs.push(rate.id)
                    }
                    return rateIDs
                },
                []
            ) ?? []

        const onlyChildRateInfos = initialFormData.rateInfos.filter(
            (rateInfo) => {
                return rateInfo.id && childRateIDs.includes(rateInfo.id)
            }
        )
        const formDataNoLinkedRates = {
            ...initialFormData,
            rateInfos: onlyChildRateInfos,
        }
        // Final clean + check of data before submit - parse to state submission
        const maybeLocked = parseAndSubmit(
            initialFormData,
            formDataNoLinkedRates,
            featureFlags
        )

        if (isSubmissionError(maybeLocked)) {
            const errMessage = maybeLocked.message
            logError('submitHealthPlanPackage', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new UserInputError(errMessage, {
                message: maybeLocked.message,
            })
        }

        // If this contract is being submitted as CONTRACT_ONLY but still has associations with rates
        // we need to prune those rates at submission time to make the submission clean
        if (
            contractWithHistory.draftRevision.formData.submissionType ===
                'CONTRACT_ONLY' &&
            contractWithHistory.draftRates &&
            contractWithHistory.draftRates.length > 0
        ) {
            const rateUpdates: UpdateDraftContractRatesArgsType = {
                contractID: contractWithHistory.id,
                rateUpdates: {
                    create: [],
                    update: [],
                    link: [],
                    unlink: [],
                    delete: [],
                },
            }

            for (const draftRate of contractWithHistory.draftRates) {
                if (draftRate.revisions.length === 0) {
                    if (draftRate.parentContractID !== contractWithHistory.id) {
                        console.error(
                            'This never submitted rate is not parented to this contract',
                            contractWithHistory.id,
                            draftRate.id
                        )
                        throw new Error(
                            'This never submitted rate is not parented to this contract'
                        )
                    }

                    // this is a child draft rate, delete it
                    rateUpdates.rateUpdates.delete.push({
                        rateID: draftRate.id,
                    })
                } else {
                    // this is a linked rate, unlink it
                    rateUpdates.rateUpdates.unlink.push({
                        rateID: draftRate.id,
                    })
                }
            }
            const rateResult = await store.updateDraftContractRates(rateUpdates)
            if (rateResult instanceof Error) {
                const errMessage =
                    'Error while attempting to clean up rates from a now CONTRACT_ONLY submission'
                logError('submitHealthPlanPackage', errMessage)
                setErrorAttributesOnActiveSpan(errMessage, span)
                throw new Error(errMessage)
            }
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

        // then submit the contract!
        const submitContractResult = await store.submitContract({
            contractID: updateResult.id,
            submittedByUserID: user.id,
            submittedReason: updateInfo.updatedReason,
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

        let stateAnalystsEmails: string[] = []
        if (readStateAnalystsFromDBFlag) {
            // not great that state code type isn't being used in ContractType but I'll risk the conversion for now
            const stateAnalystsEmailsResult =
                await store.findStateAssignedUsers(
                    updatedPackage.stateCode as StateCodeType
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
                    updatedPackage.stateCode
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
