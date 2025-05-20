import type { Store } from '../../postgres'
import type { MutationResolvers } from '../../gen/gqlServer'
import {
    setErrorAttributesOnActiveSpan,
    setResolverDetailsOnActiveSpan,
} from '../attributeHelper'
import { isStateUser, type RateRevisionType } from '../../domain-models'
import { logError } from '../../logger'
import { ForbiddenError, UserInputError } from 'apollo-server-lambda'
import { NotFoundError } from '../../postgres'
import { GraphQLError } from 'graphql/index'
import type { LDService } from '../../launchDarkly/launchDarkly'
import { generateRateCertificationName } from './generateRateCertificationName'
import { findStatePrograms } from '@mc-review/hpp'
import { nullsToUndefined } from '../../domain-models/nullstoUndefined'
import { generateDocumentZip } from '../../s3/zip'
import { type Span } from '@opentelemetry/api'

/*
    Submit rate will change a draft revision to submitted and generate a rate name if one is missing
    Also, if form data is passed in (such as on standalone rate edits) the form data itself will be updated
*/
export function submitRate(
    store: Store,
    launchDarkly: LDService
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

        // throw error if the feature flag is off
        if (!featureFlags?.['rate-edit-unlock']) {
            const errMessage = `Not authorized to edit and submit a rate independently, the feature is disabled`
            logError('submitRate', errMessage)
            throw new ForbiddenError(errMessage, {
                message: errMessage,
            })
        }

        // This resolver is only callable by State users
        if (!isStateUser(user)) {
            const errMessage = 'user not authorized to submit rate'
            logError('submitRate', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new ForbiddenError(errMessage)
        }

        // find the rate to submit
        const unsubmittedRate = await store.findRateWithHistory(rateID)

        if (unsubmittedRate instanceof Error) {
            if (unsubmittedRate instanceof NotFoundError) {
                const errMessage = `A rate must exist to be submitted: ${rateID}`
                logError('submitRate', errMessage)
                setErrorAttributesOnActiveSpan(errMessage, span)
                throw new UserInputError(errMessage, {
                    argumentName: 'rateID',
                })
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
            throw new UserInputError(errMessage, {
                argumentName: 'rateID',
                cause: 'INVALID_PACKAGE_STATUS',
            })
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
        const generatedRateCertName = formData
            ? generateRateCertificationName(
                  nullsToUndefined(formData),
                  stateCode,
                  statePrograms
              )
            : generateRateCertificationName(
                  draftRateRevision.formData,
                  stateCode,
                  statePrograms
              )

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
                      rateDocuments: formData.rateDocuments
                          ? formData.rateDocuments.map((doc) => {
                                return {
                                    name: doc.name,
                                    sha256: doc.sha256,
                                    s3URL: doc.s3URL,
                                    downloadURL: doc.downloadURL ?? undefined,
                                    dateAdded: doc.dateAdded ?? undefined,
                                }
                            })
                          : [],
                      supportingDocuments: formData.supportingDocuments
                          ? formData.rateDocuments.map((doc) => {
                                return {
                                    name: doc.name,
                                    sha256: doc.sha256,
                                    s3URL: doc.s3URL,
                                    downloadURL: doc.downloadURL ?? undefined,
                                    dateAdded: doc.dateAdded ?? undefined,
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

        // Generate zip files for rate docs
        if (submittedRate.packageSubmissions[0]?.rateRevision) {
            const rateRevision =
                submittedRate.packageSubmissions[0].rateRevision

            // Check if there are documents to zip
            // Adapt the field names as needed based on your actual data structure
            const hasRateDocuments =
                rateRevision.formData.rateDocuments &&
                rateRevision.formData.rateDocuments.length > 0
            const hasSupportingDocuments =
                rateRevision.formData.supportingDocuments &&
                rateRevision.formData.supportingDocuments.length > 0

            if (hasRateDocuments || hasSupportingDocuments) {
                console.info(
                    `Generating zip for rate documents for rate revision ${rateRevision.id}`
                )

                const zipResult = await generateRateDocumentsZip(
                    store,
                    rateRevision,
                    span
                )

                if (zipResult instanceof Error) {
                    // Log the error but continue with submission
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
            } else {
                console.info(
                    `No rate documents found for revision ${rateRevision.id}, skipping zip generation`
                )
            }
        }

        return {
            rate: submittedRate,
        }
    }
}

/**
 * Helper function to generate and store zip files for rate documents
 *
 * @param store Prisma store instance
 * @param rateRevision The rate revision with documents to zip
 * @param span Optional OpenTelemetry span for tracing
 * @returns void if successful, Error if something failed
 */
export async function generateRateDocumentsZip(
    store: Store,
    rateRevision: RateRevisionType,
    span?: Span
): Promise<void | Error> {
    const rateRevisionID = rateRevision.id

    // Get all rate-related documents
    // Adapt these field names as needed based on your actual data structure
    const rateDocuments = [
        ...(rateRevision.formData.rateDocuments || []),
        ...(rateRevision.formData.supportingDocuments || []),
    ]

    if (!rateDocuments || rateDocuments.length === 0) {
        // No documents to zip
        return
    }

    try {
        // Create an S3 key (destination path) for the zip file
        const s3DestinationKey = `zips/rates/${rateRevisionID}/rate-documents.zip`

        // Generate the zip file and upload it to S3
        const zipResult = await generateDocumentZip(
            rateDocuments,
            s3DestinationKey
        )

        if (zipResult instanceof Error) {
            logError('generateRateDocumentsZip', zipResult)
            if (span) {
                setErrorAttributesOnActiveSpan(
                    'rate documents zip generation failed',
                    span
                )
            }
            return zipResult
        }

        // Store zip information in database
        const createResult = await store.createDocumentZipPackage({
            s3URL: zipResult.s3URL,
            sha256: zipResult.sha256,
            rateRevisionID,
            documentType: 'RATE_DOCUMENTS',
        })

        if (createResult instanceof Error) {
            logError(
                'generateRateDocumentsZip - database storage failed',
                createResult
            )
            if (span) {
                setErrorAttributesOnActiveSpan(
                    'rate documents zip database storage failed',
                    span
                )
            }
            return createResult
        }

        console.info(
            `Successfully generated zip for rate documents: ${zipResult.s3URL}`
        )
        return
    } catch (error: unknown) {
        const errorMessage =
            error instanceof Error ? error.message : String(error)
        const err = new Error(
            `Unexpected error in generateRateDocumentsZip: ${errorMessage}`
        )
        logError('generateRateDocumentsZip', err)
        if (span) {
            setErrorAttributesOnActiveSpan(
                'rate documents zip generation failed',
                span
            )
        }
        return err
    }
}
