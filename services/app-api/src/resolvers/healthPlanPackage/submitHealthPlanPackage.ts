import { ForbiddenError, UserInputError } from 'apollo-server-lambda'
import {
    UnlockedHealthPlanFormDataType,
    hasValidContract,
    hasValidDocuments,
    hasValidRates,
    hasAnyValidRateData,
    hasValidSupportingDocumentCategories,
    isContractAndRates,
    isLockedHealthPlanFormData,
    LockedHealthPlanFormDataType,
    removeRatesData,
    hasValidRateCertAssurance,
} from '../../../../app-web/src/common-code/healthPlanFormDataType'
import {
    UpdateInfoType,
    isStateUser,
    HealthPlanPackageType,
    packageStatus,
    packageSubmitters,
} from '../../domain-models'
import { Emailer } from '../../emailer'
import { MutationResolvers, State } from '../../gen/gqlServer'
import { logError, logSuccess } from '../../logger'
import { isStoreError, Store } from '../../postgres'
import {
    setResolverDetailsOnActiveSpan,
    setErrorAttributesOnActiveSpan,
    setSuccessAttributesOnActiveSpan,
} from '../attributeHelper'
import { toDomain } from '../../../../app-web/src/common-code/proto/healthPlanFormDataProto'
import { EmailParameterStore } from '../../parameterStore'
import { LDService } from '../../launchDarkly/launchDarkly'
import { FlagValueTypes } from 'app-web/src/common-code/featureFlags'

export const SubmissionErrorCodes = ['INCOMPLETE', 'INVALID'] as const
type SubmissionErrorCode = typeof SubmissionErrorCodes[number] // iterable union type

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

// This is a state machine transition to turn an Unlocked to Locked Form Data
// It will return an error if there are any missing fields that are required to submit
// This strategy (returning a different type from validation) is taken from the
// "parse, don't validate" article: https://lexi-lambda.github.io/blog/2019/11/05/parse-don-t-validate/
function submit(
    draft: UnlockedHealthPlanFormDataType,
    rateCertAssuranceFlag: FlagValueTypes
): LockedHealthPlanFormDataType | SubmissionError {
    const maybeStateSubmission: Record<string, unknown> = {
        ...draft,
        status: 'SUBMITTED',
        submittedAt: new Date(),
    }

    // Valid rate cert assurance questions always true if feature flag is off so to not block submissions. Otherwise
    // hasValidRateCertAssurance will validate submission on rate cert assurance questions.
    const validRateCertAssurance = rateCertAssuranceFlag
        ? hasValidRateCertAssurance(
              maybeStateSubmission as LockedHealthPlanFormDataType
          )
        : true

    if (
        isLockedHealthPlanFormData(maybeStateSubmission) &&
        validRateCertAssurance
    )
        return maybeStateSubmission
    else if (
        !validRateCertAssurance ||
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
export function submitHealthPlanPackageResolver(
    store: Store,
    emailer: Emailer,
    emailParameterStore: EmailParameterStore,
    launchDarkly: LDService
): MutationResolvers['submitHealthPlanPackage'] {
    return async (_parent, { input }, context) => {
        const { user, span } = context
        const { submittedReason, pkgID } = input
        setResolverDetailsOnActiveSpan('submitHealthPlanPackage', user, span)
        span?.setAttribute('mcreview.package_id', pkgID)

        const rateCertAssuranceFlag = await launchDarkly.getFeatureFlag(
            context,
            'rate-cert-assurance'
        )

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

        // fetch from the store
        const result = await store.findHealthPlanPackage(input.pkgID)

        if (isStoreError(result)) {
            const errMessage = `Issue finding a package of type ${result.code}. Message: ${result.message}`
            logError('submitHealthPlanPackage', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new Error(errMessage)
        }

        if (result === undefined) {
            const errMessage = `A draft must exist to be submitted: ${input.pkgID}`
            logError('submitHealthPlanPackage', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new UserInputError(errMessage, {
                argumentName: 'pkgID',
            })
        }

        const planPackage: HealthPlanPackageType = result
        const planPackageStatus = packageStatus(planPackage)
        const currentRevision = planPackage.revisions[0]

        // Authorization
        const stateFromCurrentUser: State['code'] = user.stateCode
        if (planPackage.stateCode !== stateFromCurrentUser) {
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

        //Set updateInfo default to initial submission
        const updateInfo: UpdateInfoType = {
            updatedAt: new Date(),
            updatedBy: context.user.email,
            updatedReason: 'Initial submission',
        }

        //If this is a resubmission set updateInfo updated reason to input.
        if (planPackageStatus === 'UNLOCKED' && submittedReason) {
            updateInfo.updatedReason = submittedReason
            //Throw error if resubmitted without reason. We want to require an input reason for resubmission, but not for
            // initial submission
        } else if (planPackageStatus === 'UNLOCKED' && !submittedReason) {
            const errMessage = 'Resubmission requires a reason'
            logError('submitHealthPlanPackage', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new UserInputError(errMessage)
        } else if (
            planPackageStatus === 'RESUBMITTED' ||
            planPackageStatus === 'SUBMITTED'
        ) {
            const errMessage = `Attempted to submit an already submitted package.`
            logError('submitHealthPlanPackage', errMessage)
            throw new UserInputError(errMessage) // TODO: This is should be a custom ApolloError such as INVALID_PACKAGE_STATUS or ACTION_UNAVAILABLE, not user input error since doesn't involve form fields the user controls
        }

        const draftResult = toDomain(currentRevision.formDataProto)

        if (draftResult instanceof Error) {
            const errMessage = `Failed to decode draft proto ${draftResult}.`
            logError('submitHealthPlanPackage', errMessage)
            throw new Error(errMessage)
        }

        if (draftResult.status === 'SUBMITTED') {
            const errMessage = `Attempted to submit an already submitted package.`
            logError('submitHealthPlanPackage', errMessage)
            throw new Error(errMessage)
        }

        // CONTRACT_ONLY submission should not contain any CONTRACT_AND_RATE rates data. We will delete if any valid
        // rate data is in a CONTRACT_ONLY submission. This deletion is done at submission instead of update to preserve
        // rates data in case user did not intend or would like to revert the submission type before submitting.
        if (
            draftResult.submissionType === 'CONTRACT_ONLY' &&
            hasAnyValidRateData(draftResult)
        ) {
            Object.assign(draftResult, removeRatesData(draftResult))
        }

        // attempt to parse into a StateSubmission
        const submissionResult = submit(draftResult, rateCertAssuranceFlag)

        if (isSubmissionError(submissionResult)) {
            const errMessage = submissionResult.message
            logError('submitHealthPlanPackage', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new UserInputError(errMessage, {
                message: submissionResult.message,
            })
        }

        const lockedFormData: LockedHealthPlanFormDataType = submissionResult

        // Save the package!
        const updateResult = await store.updateHealthPlanRevision(
            planPackage.id,
            currentRevision.id,
            lockedFormData,
            updateInfo
        )
        if (isStoreError(updateResult)) {
            const errMessage = `Issue updating a package of type ${updateResult.code}. Message: ${updateResult.message}`
            logError('submitHealthPlanPackage', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new Error(errMessage)
        }

        const updatedPackage: HealthPlanPackageType = updateResult

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
            throw new Error(statePrograms.message)
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

        if (cmsPackageEmailResult instanceof Error) {
            logError(
                'submitHealthPlanPackage - CMS email failed',
                cmsPackageEmailResult
            )
            setErrorAttributesOnActiveSpan('CMS email failed', span)
            throw cmsPackageEmailResult
        }

        if (statePackageEmailResult instanceof Error) {
            logError(
                'submitHealthPlanPackage - state email failed',
                statePackageEmailResult
            )
            setErrorAttributesOnActiveSpan('state email failed', span)
            throw statePackageEmailResult
        }

        logSuccess('submitHealthPlanPackage')
        setSuccessAttributesOnActiveSpan(span)
        return { pkg: updatedPackage }
    }
}
