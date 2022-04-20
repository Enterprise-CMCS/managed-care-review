import { ForbiddenError, UserInputError } from 'apollo-server-lambda'
import {
    UnlockedHealthPlanFormDataType,
    hasValidContract,
    hasValidDocuments,
    hasValidRates,
    hasValidSupportingDocumentCategories,
    isContractAndRates,
    isLockedHealthPlanFormData,
    LockedHealthPlanFormDataType,
    packageName,
} from '../../../app-web/src/common-code/domain-models'
import {
    UpdateInfoType,
    isStateUser,
    HealthPlanPackageType,
    packageStatus,
} from '../domain-models'
import { Emailer } from '../emailer'
import { MutationResolvers, State } from '../gen/gqlServer'
import { logError, logSuccess } from '../logger'
import { isStoreError, Store } from '../postgres'
import {
    setResolverDetailsOnActiveSpan,
    setErrorAttributesOnActiveSpan,
    setSuccessAttributesOnActiveSpan,
} from './attributeHelper'
import { toDomain } from '../../../app-web/src/common-code/proto/stateSubmission'

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
    draft: UnlockedHealthPlanFormDataType
): LockedHealthPlanFormDataType | SubmissionError {
    const maybeStateSubmission: Record<string, unknown> = {
        ...draft,
        status: 'SUBMITTED',
        submittedAt: new Date(),
    }
    if (isLockedHealthPlanFormData(maybeStateSubmission))
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
export function submitHealthPlanPackageResolver(
    store: Store,
    emailer: Emailer
): MutationResolvers['submitHealthPlanPackage'] {
    return async (_parent, { input }, context) => {
        const { user, span } = context
        const { submittedReason } = input
        setResolverDetailsOnActiveSpan('submitHealthPlanPackage', user, span)

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
        const stateFromCurrentUser: State['code'] = user.state_code
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

        const draftResult = toDomain(currentRevision.formDataProto)

        if (draftResult instanceof Error) {
            const errMessage = `Failed to decode draft proto ${draftResult}.`
            logError('submitHealthPlanPackage', errMessage)
            throw new Error(errMessage)
        }

        if (draftResult.status === 'SUBMITTED') {
            const errMessage = `Attempted to submit and already submitted package.`
            logError('submitHealthPlanPackage', errMessage)
            throw new Error(errMessage)
        }

        //Set submitInfo default to initial submission
        const submitInfo: UpdateInfoType = {
            updatedAt: new Date(),
            updatedBy: context.user.email,
            updatedReason: 'Initial submission',
        }

        //If this is a resubmission set submitInfo updated reason to input.
        if (planPackageStatus === 'UNLOCKED' && submittedReason) {
            submitInfo.updatedReason = submittedReason
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
            const errMessage = `Attempted to submit and already submitted package.`
            logError('submitHealthPlanPackage', errMessage)
            throw new UserInputError(errMessage)
        }

        // attempt to parse into a StateSubmission
        const submissionResult = submit(draftResult)

        if (isSubmissionError(submissionResult)) {
            const errMessage = 'Incomplete package cannot be submitted'
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
            submitInfo
        )
        if (isStoreError(updateResult)) {
            const errMessage = `Issue updating a package of type ${updateResult.code}. Message: ${updateResult.message}`
            logError('submitHealthPlanPackage', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new Error(errMessage)
        }

        const updatedPackage: HealthPlanPackageType = updateResult

        const programs = store.findPrograms(
            updatedPackage.stateCode,
            lockedFormData.programIDs
        )
        if (!programs || programs.length !== lockedFormData.programIDs.length) {
            const errMessage = `Can't find programs ${lockedFormData.programIDs} from state ${lockedFormData.stateCode}, ${lockedFormData.id}`
            logError('unlockHealthPlanPackage', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new Error(errMessage)
        }

        // Send emails!
        const name = packageName(lockedFormData, programs)

        const status = packageStatus(updatedPackage)
        let cmsPackageEmailResult
        let statePackageEmailResult

        // Check for submitted or resubmitted status and send emails accordingly
        if (status === 'RESUBMITTED') {
            logSuccess('It was resubmitted')
            const updatedEmailData = {
                ...submitInfo,
                packageName: name,
            }
            cmsPackageEmailResult = await emailer.sendResubmittedCMSEmail(
                lockedFormData,
                updatedEmailData
            )
            statePackageEmailResult = await emailer.sendResubmittedStateEmail(
                lockedFormData,
                updatedEmailData,
                user
            )
        } else if (status === 'SUBMITTED') {
            cmsPackageEmailResult = await emailer.sendCMSNewPackage(
                lockedFormData,
                name
            )
            statePackageEmailResult = await emailer.sendStateNewPackage(
                lockedFormData,
                name,
                user
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
