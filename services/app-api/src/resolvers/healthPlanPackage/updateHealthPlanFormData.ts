import { ForbiddenError, UserInputError } from 'apollo-server-lambda'
import type { UnlockedHealthPlanFormDataType } from '../../../../app-web/src/common-code/healthPlanFormDataType'
import { base64ToDomain } from '../../../../app-web/src/common-code/proto/healthPlanFormDataProto'
import {
    convertContractWithRatesToUnlockedHPP,
    isStateUser,
} from '../../domain-models'
import type { MutationResolvers } from '../../gen/gqlServer'
import { logError, logSuccess } from '../../logger'
import type { Store } from '../../postgres'
import { NotFoundError } from '../../postgres'
import {
    setErrorAttributesOnActiveSpan,
    setResolverDetailsOnActiveSpan,
    setSuccessAttributesOnActiveSpan,
} from '../attributeHelper'
import type { LDService } from '../../launchDarkly/launchDarkly'
import { GraphQLError } from 'graphql/index'
import { convertHealthPlanPackageRatesToDomain } from './contractAndRates/resolverHelpers'

export function updateHealthPlanFormDataResolver(
    store: Store,
    launchDarkly: LDService
): MutationResolvers['updateHealthPlanFormData'] {
    return async (_parent, { input }, context) => {
        const { user, span } = context
        setResolverDetailsOnActiveSpan('updateHealthPlanFormData', user, span)

        const featureFlags = await launchDarkly.allFlags(context)

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

        // If the client tries to update a rate without setting its ID that's an error.
        for (const rateFD of unlockedFormData.rateInfos) {
            if (!rateFD.id) {
                const errMessage = `Attempted to update a rateInfo that has no ID: ${input.pkgID} ${rateFD}`
                logError('updateHealthPlanFormData', errMessage)
                setErrorAttributesOnActiveSpan(errMessage, span)
                throw new UserInputError(errMessage, {
                    argumentName: 'healthPlanFormData.rateInfo',
                })
            }
        }

        // Clear out existing statutoryRegulatoryAttestationDescription if statutoryRegulatoryAttestation is true
        if (
            featureFlags?.['438-attestation'] &&
            formDataResult.statutoryRegulatoryAttestation &&
            formDataResult.statutoryRegulatoryAttestationDescription
        ) {
            formDataResult.statutoryRegulatoryAttestationDescription = undefined
        }

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
        const updateResult = await store.updateDraftContractWithRates({
            contractID: input.pkgID,
            formData: {
                ...unlockedFormData,
                ...unlockedFormData.contractAmendmentInfo?.modifiedProvisions,
                managedCareEntities: unlockedFormData.managedCareEntities,
                stateContacts: unlockedFormData.stateContacts,
                supportingDocuments: unlockedFormData.documents.map((doc) => {
                    return {
                        name: doc.name,
                        s3URL: doc.s3URL,
                        sha256: doc.sha256,
                        id: doc.id,
                        dateAdded: new Date(),
                    }
                }),
                contractDocuments: unlockedFormData.contractDocuments.map(
                    (doc) => {
                        return {
                            name: doc.name,
                            s3URL: doc.s3URL,
                            sha256: doc.sha256,
                            id: doc.id,
                            dateAdded: new Date(),
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
        const pkg = convertContractWithRatesToUnlockedHPP(updateResult)

        if (pkg instanceof Error) {
            const errMessage = `Error converting draft contract. Message: ${pkg.message}`
            logError('updateHealthPlanFormData', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new GraphQLError(errMessage, {
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                    cause: 'PROTO_DECODE_ERROR',
                },
            })
        }

        logSuccess('updateHealthPlanFormData')
        setSuccessAttributesOnActiveSpan(span)

        return { pkg }
    }
}
