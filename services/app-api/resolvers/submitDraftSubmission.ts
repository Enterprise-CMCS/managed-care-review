import { ForbiddenError, UserInputError } from 'apollo-server-lambda'
import {
    DraftSubmissionType,
    hasValidContract,
    hasValidDocuments,
    hasValidRates,
    hasValidSupportingDocumentCategories,
    isContractAndRates,
    isStateSubmission,
    isStateUser,
    StateSubmissionType,
    Submission2Type,
    submissionName,
    submissionStatus,
    UpdateInfoType
} from '../../app-web/src/common-code/domain-models'
import { Emailer } from '../emailer'
import { MutationResolvers, State } from '../gen/gqlServer'
import { logError, logSuccess } from '../logger'
import { isStoreError, Store } from '../postgres'
import {
    setResolverDetailsOnActiveSpan,
    setErrorAttributesOnActiveSpan,
    setSuccessAttributesOnActiveSpan
} from './attributeHelper'
import { toDomain } from '../../app-web/src/common-code/proto/stateSubmission'

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

// This is a state machine transition to turn a draft into a StateSubmission
// It will return an error if there are any missing fields that are required by the state submission
// This strategy (returning a different type from validation) is taken from the
// "parse, don't validate" article: https://lexi-lambda.github.io/blog/2019/11/05/parse-don-t-validate/
function submit(
    draft: DraftSubmissionType
): StateSubmissionType | SubmissionError {
    const maybeStateSubmission: Record<string, unknown> = {
        ...draft,
        status: 'SUBMITTED',
        submittedAt: new Date(),
    }
    if (isStateSubmission(maybeStateSubmission)) return maybeStateSubmission

    else if (!hasValidContract(maybeStateSubmission as StateSubmissionType)) {
        return {
            code: 'INCOMPLETE',
            message: 'submissions is missing required contract fields',
        }
    } else if (!hasValidRates(maybeStateSubmission as StateSubmissionType)) {
        return isContractAndRates(draft)
            ? {
                  code: 'INCOMPLETE',
                  message: 'submission is missing required rate fields',
              }
            : {
                  code: 'INVALID',
                  message: 'submission includes invalid rate fields',
              }
    } else if (
        !hasValidDocuments(maybeStateSubmission as StateSubmissionType)
    ) {
        return {
            code: 'INCOMPLETE',
            message: 'submissions must have valid documents',
        }
    } else if (
        !hasValidSupportingDocumentCategories(
            maybeStateSubmission as StateSubmissionType
        )
    ) {
        return {
            code: 'INCOMPLETE',
            message: 'submissions must have valid categories for supporting documents',
        }
    }
    else
        return {
            code: 'INCOMPLETE',
            message: 'submission is missing a required field',
        }
}

// submitDraftSubmissionResolver is a state machine transition for Submission,
// transforming it from a DraftSubmission to a StateSubmission
export function submitDraftSubmissionResolver(
    store: Store,
    emailer: Emailer
): MutationResolvers['submitDraftSubmission'] {
    return async (_parent, { input }, context) => {
        const { user, span } = context
        const { submittedReason } = input
        setResolverDetailsOnActiveSpan('submitDraftSubmission', user, span)

        // This resolver is only callable by state users
        if (!isStateUser(user)) {
            logError(
                'submitDraftSubmission',
                'user not authorized to fetch state data'
            )
            setErrorAttributesOnActiveSpan('user not authorized to fetch state data', span)
            throw new ForbiddenError('user not authorized to fetch state data')
        }

        // fetch from the store
        const result = await store.findSubmissionWithRevisions(input.submissionID)

        if (isStoreError(result)) {
            const errMessage = `Issue finding a draft submission of type ${result.code}. Message: ${result.message}`
            logError('submitDraftSubmission', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new Error(errMessage)
        }

        if (result === undefined) {
            const errMessage = `A draft must exist to be submitted: ${input.submissionID}`
            logError('submitDraftSubmission', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new UserInputError(errMessage, {
                argumentName: 'submissionID',
            })
        }

        const planPackage: Submission2Type = result
        const planPackageStatus = submissionStatus(planPackage)
        const currentRevision = planPackage.revisions[0]

        // Authorization
        const stateFromCurrentUser: State['code'] = user.state_code
        if (planPackage.stateCode !== stateFromCurrentUser) {
            logError(
                'submitDraftSubmission',
                'user not authorized to fetch data from a different state'
            )
            setErrorAttributesOnActiveSpan('user not authorized to fetch data from a different state', span)
            throw new ForbiddenError(
                'user not authorized to fetch data from a different state'
            )
        }

        const draftResult = toDomain(currentRevision.submissionFormProto)

        if (draftResult instanceof Error) {
            const errMessage = `Failed to decode draft proto ${draftResult}.`
            logError('submitDraftSubmission', errMessage)
            throw new Error(errMessage)
        }

        if (draftResult.status === 'SUBMITTED') {
            const errMessage = `Attempted to submit and already submitted package.`
            logError('submitDraftSubmission', errMessage)
            throw new Error(errMessage)
        }

        //Set submitInfo default to initial submission
        const submitInfo: UpdateInfoType = {
            updatedAt: new Date(),
            updatedBy: context.user.email,
            updatedReason: 'Initial submission'
        }

        //If submission is a resubmission set submitInfo updated reason to input.
        if (planPackageStatus === 'UNLOCKED' && submittedReason ) {
            submitInfo.updatedReason = submittedReason
        //Throw error if resubmitted without reason. We want to require an input reason for resubmission, but not for
        // initial submission
        } else if (planPackageStatus === 'UNLOCKED' && !submittedReason) {
            logError(
                'submitDraftSubmission',
                'Incomplete submission cannot be submitted, resubmission reason is required'
            )
            setErrorAttributesOnActiveSpan('Incomplete submission cannot be submitted', span)
            throw new UserInputError('Incomplete submission cannot be submitted, resubmission reason is required',)
        } else if (planPackageStatus === 'RESUBMITTED' || planPackageStatus === 'SUBMITTED') {
            const errMessage = `Attempted to submit and already submitted package.`
            logError('submitDraftSubmission', errMessage)
            throw new Error(errMessage)
        }

        // attempt to parse into a StateSubmission
        const submissionResult = submit(draftResult)

        if (isSubmissionError(submissionResult)) {
            logError(
                'submitDraftSubmission',
                'Incomplete submission cannot be submitted'
            )
            setErrorAttributesOnActiveSpan('Incomplete submission cannot be submitted', span)
            throw new UserInputError(
                'Incomplete submission cannot be submitted',
                {
                    message: submissionResult.message,
                }
            )
        }

        const stateSubmission: StateSubmissionType = submissionResult

        // Save the submission!
        const updateResult = await store.updateStateSubmission(stateSubmission, submitInfo)
        if (isStoreError(updateResult)) {
            const errMessage = `Issue updating a state submission of type ${updateResult.code}. Message: ${updateResult.message}`
            logError('submitDraftSubmission', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new Error(errMessage)
        }

        const updatedSubmission: Submission2Type = updateResult

        const programs = store.findPrograms(updatedSubmission.stateCode, stateSubmission.programIDs)
        if (!programs || programs.length !== stateSubmission.programIDs.length) {
            const errMessage = `Can't find programs ${stateSubmission.programIDs} from state ${stateSubmission.stateCode}, ${stateSubmission.id}`
            logError('unlockStateSubmission', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new Error(errMessage)
        }

        // Send emails!
        const name = submissionName(stateSubmission, programs)

		const status = submissionStatus(updatedSubmission)
        let cmsPackageEmailResult
        let statePackageEmailResult

        // Check for submitted or resubmitted status and send emails accordingly
        if (status === 'RESUBMITTED') {
            logSuccess('It was resubmitted')
            const updatedEmailData = {
                ...submitInfo,
                submissionName: name
            }
            cmsPackageEmailResult = await emailer.sendResubmittedCMSEmail(stateSubmission, updatedEmailData)
            statePackageEmailResult =
                await emailer.sendResubmittedStateEmail(stateSubmission, updatedEmailData, user)
        } else if (status === 'SUBMITTED') {
            cmsPackageEmailResult = await emailer.sendCMSNewPackage(stateSubmission, name)
            statePackageEmailResult =
                await emailer.sendStateNewPackage(stateSubmission, name, user)
        }

        if (cmsPackageEmailResult instanceof Error) {
            logError(
                'submitDraftSubmission - CMS email failed',
                cmsPackageEmailResult
            )
            setErrorAttributesOnActiveSpan('CMS email failed', span)
            throw cmsPackageEmailResult
        }

        if (statePackageEmailResult instanceof Error) {
            logError(
                'submitDraftSubmission - state email failed',
                statePackageEmailResult
            )
            setErrorAttributesOnActiveSpan('state email failed', span)
            throw statePackageEmailResult
        }

        logSuccess('submitDraftSubmission')
        setSuccessAttributesOnActiveSpan(span)
        return { submission: updatedSubmission }
    }
}
