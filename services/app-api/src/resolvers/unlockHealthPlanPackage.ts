import { ForbiddenError, UserInputError } from 'apollo-server-lambda'
import {
    UnlockedHealthPlanFormDataType,
    LockedHealthPlanFormDataType,
    packageName,
} from '../../../app-web/src/common-code/domain-models'
import { toDomain } from '../../../app-web/src/common-code/proto/stateSubmission'
import {
    isCMSUser,
    UpdateInfoType,
    HealthPlanPackageType,
    packageStatus,
} from '../domain-models'
import { Emailer } from '../emailer'
import { MutationResolvers } from '../gen/gqlServer'
import { logError, logSuccess } from '../logger'
import { isStoreError, Store } from '../postgres'
import {
    setErrorAttributesOnActiveSpan,
    setResolverDetailsOnActiveSpan,
    setSuccessAttributesOnActiveSpan,
} from './attributeHelper'

// unlock is a state machine transforming a LockedFormDatya and turning it into UnlockedFormData
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
    emailer: Emailer
): MutationResolvers['unlockHealthPlanPackage'] {
    return async (_parent, { input }, context) => {
        const { user, span } = context
        const { unlockedReason, pkgID } = input
        setResolverDetailsOnActiveSpan('unlockHealthPlanPackage', user, span)

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

        // fetch from the store
        const result = await store.findHealthPlanPackage(pkgID)

        if (isStoreError(result)) {
            const errMessage = `Issue finding a package of type ${result.code}. Message: ${result.message}`
            logError('unlockHealthPlanPackage', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new Error(errMessage)
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
            const errMessage = 'Attempted to unlock package with wrong status'
            logError('unlockHealthPlanPackage', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new UserInputError(errMessage)
        }

        // pull the current revision out to unlock it.
        const formDataResult = toDomain(currentRevision.formDataProto)
        if (formDataResult instanceof Error) {
            const errMessage = `Failed to decode proto ${formDataResult}.`
            logError('unlockHealthPlanPackage', errMessage)
            throw new Error(errMessage)
        }

        if (formDataResult.status !== 'SUBMITTED') {
            const errMessage = `A locked package had unlocked formData.`
            logError('unlockHealthPlanPackage', errMessage)
            throw new Error(errMessage)
        }

        const draft: UnlockedHealthPlanFormDataType = unlock(formDataResult)

        // Create a new revision with this draft in it
        const unlockInfo: UpdateInfoType = {
            updatedAt: new Date(),
            updatedBy: context.user.email,
            updatedReason: unlockedReason,
        }

        const revisionResult = await store.insertHealthPlanRevision(
            pkgID,
            unlockInfo,
            draft
        )

        if (isStoreError(revisionResult)) {
            const errMessage = `Issue unlocking a package of type ${revisionResult.code}. Message: ${revisionResult.message}`
            logError('unlockHealthPlanPackage', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new Error(errMessage)
        }

        const programs = store.findPrograms(draft.stateCode, draft.programIDs)
        if (!programs || programs.length !== draft.programIDs.length) {
            const errMessage = `Can't find programs ${draft.programIDs} from state ${draft.stateCode}, ${draft.id}`
            logError('unlockHealthPlanPackage', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new Error(errMessage)
        }

        // Send emails!
        const name = packageName(draft, programs)

        const updatedEmailData = {
            ...unlockInfo,
            packageName: name,
        }
        const unlockPackageCMSEmailResult =
            await emailer.sendUnlockPackageCMSEmail(updatedEmailData)

        const unlockPackageStateEmailResult =
            await emailer.sendUnlockPackageStateEmail(draft, updatedEmailData)

        if (unlockPackageCMSEmailResult instanceof Error) {
            logError(
                'unlockPackageCMSEmail - CMS email failed',
                unlockPackageCMSEmailResult
            )
            throw unlockPackageCMSEmailResult
        }

        if (unlockPackageStateEmailResult instanceof Error) {
            logError(
                'unlockPackageCMSEmail - CMS email failed',
                unlockPackageStateEmailResult
            )
            throw unlockPackageStateEmailResult
        }

        logSuccess('unlockHealthPlanPackage')
        setSuccessAttributesOnActiveSpan(span)

        return { pkg: revisionResult }
    }
}
