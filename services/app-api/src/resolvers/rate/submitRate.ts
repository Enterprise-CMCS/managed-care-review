import type { MutationResolvers } from '../../gen/gqlServer'
import {
    setErrorAttributesOnActiveSpan,
    setResolverDetailsOnActiveSpan,
} from '../attributeHelper'
import { isStateUser } from '../../domain-models'
import { logError } from '../../logger'
import { createForbiddenError, createUserInputError } from '../errorUtils'
import { NotFoundError, type Store } from '../../postgres'
import { GraphQLError } from 'graphql/index'
import type { LDService } from '../../launchDarkly/launchDarkly'
import { generateRateCertificationName } from './generateRateCertificationName'
import { findStatePrograms } from '@mc-review/submissions'
import { canWrite } from '../../authorization/oauthAuthorization'
import type { DocumentZipService } from '../../zip/generateZip'
import { parseAndValidateDocuments } from '../documentHelpers'

/*
    Submit rate will change a draft revision to submitted and generate a rate name if one is missing
    Also, if form data is passed in (such as on standalone rate edits) the form data itself will be updated
*/
export function submitRate(
    store: Store,
    launchDarkly: LDService,
    documentZip: DocumentZipService
): MutationResolvers['submitRate'] {
    return async (_parent, { input }, context) => {
        const { user, ctx, tracer } = context
        const span = tracer?.startSpan('submitRate', {}, ctx)
        setResolverDetailsOnActiveSpan('submitRate', user, span)

        const { rateID, submittedReason, formData } = input
        const featureFlags = await launchDarkly.allFlags({
            key: context.user.email,
        })

        span?.setAttribute('mcreview.rate_id', rateID)

        // Check OAuth client read permissions
        if (!canWrite(context)) {
            const errMessage = `OAuth client does not have write permissions`
            logError('submitRate', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)

            throw new GraphQLError(errMessage, {
                extensions: {
                    code: 'FORBIDDEN',
                    cause: 'INSUFFICIENT_OAUTH_GRANTS',
                },
            })
        }

        // throw error if the feature flag is off
        if (!featureFlags?.['rate-edit-unlock']) {
            const errMessage = `Not authorized to edit and submit a rate independently, the feature is disabled`
            logError('submitRate', errMessage)
            throw createForbiddenError(errMessage)
        }

        // This resolver is only callable by State users
        if (!isStateUser(user)) {
            const errMessage = 'user not authorized to submit rate'
            logError('submitRate', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw createForbiddenError(errMessage)
        }

        // find the rate to submit
        const unsubmittedRate = await store.findRateWithHistory(rateID)

        if (unsubmittedRate instanceof Error) {
            if (unsubmittedRate instanceof NotFoundError) {
                const errMessage = `A rate must exist to be submitted: ${rateID}`
                logError('submitRate', errMessage)
                setErrorAttributesOnActiveSpan(errMessage, span)
                throw createUserInputError(errMessage, 'rateID')
            }

            logError('submitRate', unsubmittedRate.message)
            setErrorAttributesOnActiveSpan(unsubmittedRate.message, span)
            throw new GraphQLError(unsubmittedRate.message, {
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                    cause: 'DB_ERROR',
                },
            })
        }

        if (
            !['UNLOCKED', 'DRAFT'].includes(unsubmittedRate.consolidatedStatus)
        ) {
            const errMessage = `Attempted to submit a rate with invalid status: ${unsubmittedRate.consolidatedStatus}`
            logError('submitRate', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw createUserInputError(errMessage, 'rateID')
        }

        const draftRateRevision = unsubmittedRate.draftRevision

        if (!draftRateRevision) {
            throw new Error(
                'PROGRAMMING ERROR: Status should not be submittable without a draft rate revision'
            )
        }

        // prepare to generate rate cert name - either use new form data coming down on submit or unsubmitted submission data already in database
        const stateCode = unsubmittedRate.stateCode
        const statePrograms = findStatePrograms(stateCode)
        const generatedRateCertName = generateRateCertificationName(
            draftRateRevision.formData,
            stateCode,
            statePrograms
        )

        // Parse and validate documents if formData is provided
        let validatedRateDocuments
        let validatedSupportingDocuments

        if (formData) {
            if (formData.rateDocuments) {
                validatedRateDocuments = parseAndValidateDocuments(
                    formData.rateDocuments.map((d) => ({
                        name: d.name,
                        s3URL: d.s3URL,
                        sha256: d.sha256,
                    }))
                )
            }

            if (formData.supportingDocuments) {
                validatedSupportingDocuments = parseAndValidateDocuments(
                    formData.supportingDocuments.map((d) => ({
                        name: d.name,
                        s3URL: d.s3URL,
                        sha256: d.sha256,
                    }))
                )
            }
        }

        // combine existing db draft data with any form data added on submit
        // call submit rate handler
        const submittedRate = await store.submitRate({
            rateID,
            submittedByUserID: user.id,
            submittedReason: submittedReason ?? 'Initial submission',
            formData: formData
                ? {
                      rateType: formData.rateType ?? undefined,
                      rateCapitationType:
                          formData.rateCapitationType ?? undefined,
                      rateDocuments: validatedRateDocuments
                          ? validatedRateDocuments.map((doc) => {
                                return {
                                    name: doc.name,
                                    sha256: doc.sha256!, // sha256 is required in GenericDocumentInput
                                    s3URL: doc.s3URL,
                                    s3BucketName: doc.s3BucketName,
                                    s3Key: doc.s3Key,
                                }
                            })
                          : [],
                      supportingDocuments: validatedSupportingDocuments
                          ? validatedSupportingDocuments.map((doc) => {
                                return {
                                    name: doc.name,
                                    sha256: doc.sha256!, // sha256 is required in GenericDocumentInput
                                    s3URL: doc.s3URL,
                                    s3BucketName: doc.s3BucketName,
                                    s3Key: doc.s3Key,
                                }
                            })
                          : [],
                      rateDateStart: formData.rateDateStart ?? undefined,
                      rateDateEnd: formData.rateDateEnd ?? undefined,
                      rateDateCertified:
                          formData.rateDateCertified ?? undefined,
                      amendmentEffectiveDateStart:
                          formData.amendmentEffectiveDateStart ?? undefined,
                      amendmentEffectiveDateEnd:
                          formData.amendmentEffectiveDateEnd ?? undefined,
                      rateProgramIDs: formData.rateProgramIDs ?? [],
                      deprecatedRateProgramIDs:
                          formData.deprecatedRateProgramIDs ?? [],
                      certifyingActuaryContacts:
                          formData.certifyingActuaryContacts
                              ? formData.certifyingActuaryContacts.map(
                                    (contact) => ({
                                        name: contact.name ?? undefined,
                                        titleRole:
                                            contact.titleRole ?? undefined,
                                        email: contact.email ?? undefined,
                                        actuarialFirm:
                                            contact.actuarialFirm ?? undefined,
                                        actuarialFirmOther:
                                            contact.actuarialFirmOther ??
                                            undefined,
                                    })
                                )
                              : [],
                      addtlActuaryContacts: formData.addtlActuaryContacts
                          ? formData.addtlActuaryContacts.map((contact) => ({
                                name: contact.name ?? undefined,
                                titleRole: contact.titleRole ?? undefined,
                                email: contact.email ?? undefined,
                                actuarialFirm:
                                    contact.actuarialFirm ?? undefined,
                                actuarialFirmOther:
                                    contact.actuarialFirmOther ?? undefined,
                            }))
                          : [],
                      actuaryCommunicationPreference:
                          formData.actuaryCommunicationPreference ?? undefined,
                      packagesWithSharedRateCerts: [],
                      rateCertificationName:
                          formData.rateCertificationName ??
                          generatedRateCertName,
                  }
                : undefined,
        })

        if (submittedRate instanceof Error) {
            const errMessage = `Failed to submit rate with ID: ${rateID}; ${submittedRate.message}`
            logError('submitRate', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new GraphQLError(errMessage, {
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                    cause: 'DB_ERROR',
                },
            })
        }

        // generate zips
        const rateRevision = submittedRate.revisions[0]
        if (rateRevision) {
            const zipResult =
                await documentZip.generateRateDocumentsZip(rateRevision)
            if (zipResult instanceof Error) {
                // Log the error but don't fail the submission
                logError(
                    'submitRate - rate documents zip generation failed',
                    zipResult
                )
                setErrorAttributesOnActiveSpan(
                    'rate documents zip generation failed',
                    span
                )
                console.warn(
                    `Rate document zip generation failed for revision ${rateRevision.id}, but continuing with submission process`
                )
            } else {
                console.info(
                    `Successfully generated rate document zip for revision ${rateRevision.id}`
                )
            }
        }

        return {
            rate: submittedRate,
        }
    }
}
