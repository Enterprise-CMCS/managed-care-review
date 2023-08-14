import { ForbiddenError, UserInputError } from 'apollo-server-lambda'
import type { UnlockedHealthPlanFormDataType } from '../../../../app-web/src/common-code/healthPlanFormDataType'
import { convertRateSupportingDocs } from '../../../../app-web/src/common-code/healthPlanFormDataType'
import {
    base64ToDomain,
    toDomain,
} from '../../../../app-web/src/common-code/proto/healthPlanFormDataProto'
import type { HealthPlanPackageType } from '../../domain-models'
import { isStateUser, packageStatus } from '../../domain-models'
import type { MutationResolvers } from '../../gen/gqlServer'
import { logError, logSuccess } from '../../logger'
import type { Store } from '../../postgres'
import { isStoreError } from '../../postgres'
import {
    setErrorAttributesOnActiveSpan,
    setResolverDetailsOnActiveSpan,
    setSuccessAttributesOnActiveSpan,
} from '../attributeHelper'

export function updateHealthPlanFormDataResolver(
    store: Store
): MutationResolvers['updateHealthPlanFormData'] {
    return async (_parent, { input }, context) => {
        const { user, span } = context
        setResolverDetailsOnActiveSpan('updateHealthPlanFormData', user, span)

        // This resolver is only callable by state users
        if (!isStateUser(context.user)) {
            logError(
                'updateHealthPlanFormData',
                'user not authorized to modify state data'
            )
            setErrorAttributesOnActiveSpan(
                'user not authorized to modify state data',
                span
            )
            throw new ForbiddenError('user not authorized to modify state data')
        }

        const formDataResult = base64ToDomain(input.healthPlanFormData)
        if (formDataResult instanceof Error) {
            const errMessage =
                `Failed to parse out form data in request: ${input.pkgID}  ` +
                formDataResult.message
            logError('updateHealthPlanFormData', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new UserInputError(errMessage, {
                argumentName: 'healthPlanFormData',
            })
        }
        // don't send a LockedFormData to the update endpoint
        if (formDataResult.status === 'SUBMITTED') {
            const errMessage = `Attempted to update with a StateSubmission: ${input.pkgID}`
            logError('updateHealthPlanFormData', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new UserInputError(errMessage, {
                argumentName: 'healthPlanFormData',
            })
        }

        const unlockedFormData: UnlockedHealthPlanFormDataType = formDataResult
        const result = await store.findHealthPlanPackage(input.pkgID)

        if (isStoreError(result)) {
            console.info('Error finding a package', result)
            const errMessage = `Issue finding a package of type ${result.code}. Message: ${result.message}`
            logError('updateHealthPlanFormData', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new Error(errMessage)
        }

        if (result === undefined) {
            const errMessage = `No package found to update with that ID: ${input.pkgID}`
            logError('updateHealthPlanFormData', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new UserInputError(errMessage, {
                argumentName: 'pgkID',
            })
        }

        const planPackage: HealthPlanPackageType = result

        // Authorize the update
        const stateFromCurrentUser = context.user.stateCode
        if (planPackage.stateCode !== stateFromCurrentUser) {
            logError(
                'updateHealthPlanFormData',
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

        // Check the package is in an update-able state
        const planPackageStatus = packageStatus(planPackage)
        if (planPackageStatus instanceof Error) {
            const errMessage = `No revisions found on package: ${input.pkgID}`
            logError('updateHealthPlanFormData', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new Error(errMessage)
        }

        // Can't update a submission that is locked or resubmitted
        if (!['DRAFT', 'UNLOCKED'].includes(planPackageStatus)) {
            const errMessage = `Package is not in editable state: ${input.pkgID} status: ${planPackageStatus}`
            logError('updateHealthPlanFormData', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new UserInputError(errMessage, {
                argumentName: 'pkg',
            })
        }

        // Validate input against the db.
        // Having to crack this open to check on this is probably an indication that some of this info
        // really belongs on the HealthPlanPackage itself instead of being inside form data, but this is where we are now.

        const previousFormDataResult = toDomain(
            planPackage.revisions[0].formDataProto
        )
        if (previousFormDataResult instanceof Error) {
            const errMessage = `Issue deserializing old formData ${previousFormDataResult.message}`
            logError('updateHealthPlanFormData', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new Error(errMessage)
        }

        // Sanity check, Can't update a package that is locked or resubmitted in the form data either
        if (previousFormDataResult.status === 'SUBMITTED') {
            const errMessage = `Package form data is not in editable state: ${input.pkgID}`
            logError('updateHealthPlanFormData', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new UserInputError(errMessage, {
                argumentName: 'pgkID',
            })
        }

        const previousFormData: UnlockedHealthPlanFormDataType =
            previousFormDataResult

        // Validate that none of these protected fields have been modified.
        // These fields should only be modified by the server, never by an update.
        const fixedFields: (keyof UnlockedHealthPlanFormDataType)[] = [
            'id',
            'stateCode',
            'stateNumber',
            'createdAt',
            'updatedAt',
        ]
        const unfixedFields = []
        for (const fixedField of fixedFields) {
            const prevVal = previousFormData[fixedField]
            const newVal = unlockedFormData[fixedField]

            if (prevVal instanceof Date && newVal instanceof Date) {
                if (prevVal.getTime() !== newVal.getTime()) {
                    console.info(
                        `ERRMOD ${fixedField}: old: ${previousFormData[fixedField]} new: ${unlockedFormData[fixedField]}`
                    )
                    unfixedFields.push(fixedField)
                }
            } else {
                if (
                    previousFormData[fixedField] !==
                    unlockedFormData[fixedField]
                ) {
                    console.info(
                        `ERRMOD ${fixedField}: old: ${previousFormData[fixedField]} new: ${unlockedFormData[fixedField]}`
                    )
                    unfixedFields.push(fixedField)
                }
            }
        }

        if (unfixedFields.length !== 0) {
            const errMessage = `Transient server error: attempted to modify un-modifiable field(s): ${unfixedFields.join(
                ','
            )}.  Please refresh the page to continue.`
            logError('updateHealthPlanFormData', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new UserInputError(errMessage, {
                argumentName: unfixedFields.join(','),
            })
        }

        const editableRevision = planPackage.revisions[0]

        // This logic is no longer needed once SUPPORTING_DOCS_BY_RATE flag is on in production - it was used to remove rate supporting docs form contract only submisisons
        if (
            unlockedFormData.submissionType === 'CONTRACT_ONLY' &&
            unlockedFormData.documents.some((document) =>
                document.documentCategories.includes('RATES_RELATED')
            )
        ) {
            const convertedDocs = convertRateSupportingDocs(
                unlockedFormData.documents
            )
            unlockedFormData.documents = convertedDocs
        }

        // save the new form data to the db
        const updateResult = await store.updateHealthPlanRevision(
            planPackage.id,
            editableRevision.id,
            unlockedFormData
        )

        if (isStoreError(updateResult)) {
            const errMessage = `Error updating form data: ${input.pkgID}:: ${updateResult.code}: ${updateResult.message}`
            logError('updateHealthPlanFormData', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new Error(errMessage)
        }

        logSuccess('updateHealthPlanFormData')
        setSuccessAttributesOnActiveSpan(span)

        return {
            pkg: updateResult,
        }
    }
}
