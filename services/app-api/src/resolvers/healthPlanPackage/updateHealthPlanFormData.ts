import { ForbiddenError, UserInputError } from 'apollo-server-lambda'
import type { UnlockedHealthPlanFormDataType } from '../../../../app-web/src/common-code/healthPlanFormDataType'
import {
    base64ToDomain,
    toDomain,
} from '../../../../app-web/src/common-code/proto/healthPlanFormDataProto'
import type { HealthPlanPackageType } from '../../domain-models'
import {
    convertContractToUnlockedHealthPlanPackage,
    isStateUser,
    packageStatus,
} from '../../domain-models'
import type { MutationResolvers } from '../../gen/gqlServer'
import { logError, logSuccess } from '../../logger'
import type { Store } from '../../postgres'
import { isStoreError, NotFoundError } from '../../postgres'
import {
    setErrorAttributesOnActiveSpan,
    setResolverDetailsOnActiveSpan,
    setSuccessAttributesOnActiveSpan,
} from '../attributeHelper'
import type { LDService } from '../../launchDarkly/launchDarkly'
import { GraphQLError } from 'graphql/index'
import { convertHealthPlanPackageRatesToDomain } from './contractAndRates/resolverHelpers'

type ProtectedFieldType = Pick<
    UnlockedHealthPlanFormDataType,
    'id' | 'stateCode' | 'stateNumber' | 'createdAt' | 'updatedAt'
>

// Validate that none of these protected fields have been modified.
// These fields should only be modified by the server, never by an update.
function validateProtectedFields(
    previousFormData: ProtectedFieldType,
    unlockedFormData: ProtectedFieldType
): string[] {
    const fixedFields: (keyof ProtectedFieldType)[] = [
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
            if (previousFormData[fixedField] !== unlockedFormData[fixedField]) {
                console.info(
                    `ERRMOD ${fixedField}: old: ${previousFormData[fixedField]} new: ${unlockedFormData[fixedField]}`
                )
                unfixedFields.push(fixedField)
            }
        }
    }

    return unfixedFields
}

export function updateHealthPlanFormDataResolver(
    store: Store,
    launchDarkly: LDService
): MutationResolvers['updateHealthPlanFormData'] {
    return async (_parent, { input }, context) => {
        const { user, span } = context
        setResolverDetailsOnActiveSpan('updateHealthPlanFormData', user, span)

        const ratesDatabaseRefactor = await launchDarkly.getFeatureFlag(
            context,
            'rates-db-refactor'
        )

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

        // Uses new DB if flag is on
        if (ratesDatabaseRefactor) {
            // Find contract from DB
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

            // Authorize the update
            const stateFromCurrentUser = context.user.stateCode
            if (contractWithHistory.stateCode !== stateFromCurrentUser) {
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

            // Can't update a submission that is locked or resubmitted
            if (!contractWithHistory.draftRevision) {
                const errMessage = `Package is not in editable state: ${input.pkgID} status: ${contractWithHistory.status}`
                logError('updateHealthPlanFormData', errMessage)
                setErrorAttributesOnActiveSpan(errMessage, span)
                throw new UserInputError(errMessage, {
                    argumentName: 'pkg',
                })
            }

            // If updatedAt does not match concurrent editing occurred.
            if (
                contractWithHistory.draftRevision.updatedAt.getTime() !==
                unlockedFormData.updatedAt.getTime()
            ) {
                const errMessage = `Concurrent update error: The data you are trying to modify has changed since you last retrieved it. Please refresh the page to continue.`
                logError('updateHealthPlanFormData', errMessage)
                setErrorAttributesOnActiveSpan(errMessage, span)
                throw new UserInputError(errMessage)
            }

            // Check for any rate updates
            const updateRateFormDatas =
                await convertHealthPlanPackageRatesToDomain(unlockedFormData)

            if (updateRateFormDatas instanceof Error) {
                const errMessage = `Error converting rate. Message: ${updateRateFormDatas.message}`
                logError('updateHealthPlanFormData', errMessage)
                setErrorAttributesOnActiveSpan(errMessage, span)
                throw new GraphQLError(errMessage, {
                    extensions: {
                        code: 'INTERNAL_SERVER_ERROR',
                    },
                })
            }

            // Update contract draft revision
            const updateResult = await store.updateDraftContract({
                contractID: input.pkgID,
                formData: {
                    ...unlockedFormData,
                    ...unlockedFormData.contractAmendmentInfo
                        ?.modifiedProvisions,
                    managedCareEntities: unlockedFormData.managedCareEntities,
                    stateContacts: unlockedFormData.stateContacts,
                    supportingDocuments: unlockedFormData.documents.map(
                        (doc) => {
                            return {
                                name: doc.name,
                                s3URL: doc.s3URL,
                                sha256: doc.sha256,
                                id: doc.id,
                            }
                        }
                    ),
                    contractDocuments: unlockedFormData.contractDocuments.map(
                        (doc) => {
                            return {
                                name: doc.name,
                                s3URL: doc.s3URL,
                                sha256: doc.sha256,
                                id: doc.id,
                            }
                        }
                    ),
                },
                rateFormDatas: updateRateFormDatas,
            })

            if (updateResult instanceof Error) {
                const errMessage = `Error updating form data: ${input.pkgID}:: ${updateResult.message}`
                logError('updateHealthPlanFormData', errMessage)
                setErrorAttributesOnActiveSpan(errMessage, span)
                throw new GraphQLError(errMessage, {
                    extensions: {
                        code: 'INTERNAL_SERVER_ERROR',
                        cause: 'DB_ERROR',
                    },
                })
            }

            // Convert back to health plan package
            const pkg = convertContractToUnlockedHealthPlanPackage(updateResult)

            if (pkg instanceof Error) {
                const errMessage = `Error converting draft contract. Message: ${pkg.message}`
                logError('createHealthPlanPackage', errMessage)
                setErrorAttributesOnActiveSpan(errMessage, span)
                throw new GraphQLError(errMessage, {
                    extensions: {
                        code: 'INTERNAL_SERVER_ERROR',
                        cause: 'PROTO_DECODE_ERROR',
                    },
                })
            }

            return { pkg }
        } else {
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
            const unfixedFields = validateProtectedFields(
                previousFormData,
                unlockedFormData
            )

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
}
