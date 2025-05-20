import type { Emailer } from '../../emailer'
import type { LDService } from '../../launchDarkly/launchDarkly'
import type { Store } from '../../postgres'
import { NotFoundError } from '../../postgres'
import { logError, logSuccess } from '../../logger'
import { isStateUser, contractSubmitters } from '../../domain-models'
import {
    type CHIPFederalAuthority,
    federalAuthorityKeysForCHIP,
} from '@mc-review/hpp'
import { ForbiddenError, UserInputError } from 'apollo-server-lambda'
import { GraphQLError } from 'graphql'
import {
    setResolverDetailsOnActiveSpan,
    setErrorAttributesOnActiveSpan,
    setSuccessAttributesOnActiveSpan,
} from '../attributeHelper'
import type { MutationResolvers, State } from '../../gen/gqlServer'
import { parseContract } from '../../domain-models/contractAndRates/dataValidatorHelpers'
import type { UpdateInfoType, PackageStatusType } from '../../domain-models'
import type { UpdateDraftContractRatesArgsType } from '../../postgres/contractAndRates/updateDraftContractRates'
import type { StateCodeType } from '@mc-review/hpp'
import type { Span } from '@opentelemetry/api'
import {
    isCHIPOnly,
    isContractWithProvisions,
    generateApplicableProvisionsList,
} from '../../domain-models/contractAndRates'
import type { GeneralizedModifiedProvisions } from '@mc-review/hpp'
import { generateDocumentZip } from '../../s3/zip'
import type { ContractRevisionType } from '../../domain-models'

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
        logError('submitContract', errMessage)
        setErrorAttributesOnActiveSpan(errMessage, span)
        throw new UserInputError(errMessage)
    } else if (status === 'RESUBMITTED' || status === 'SUBMITTED') {
        const errMessage = `Attempted to submit an already submitted package.`
        logError('submitContract', errMessage)
        throw new GraphQLError(errMessage, {
            extensions: {
                code: 'INTERNAL_SERVER_ERROR',
                cause: 'INVALID_PACKAGE_STATUS',
            },
        })
    }
}
export function submitContract(
    store: Store,
    emailer: Emailer,
    launchDarkly: LDService
): MutationResolvers['submitContract'] {
    return async (_parent, { input }, context) => {
        const featureFlags = await launchDarkly.allFlags({
            key: context.user.email,
        })

        const { user, ctx, tracer } = context
        const span = tracer?.startSpan('submitContract', {}, ctx)
        setResolverDetailsOnActiveSpan('submitContract', user, span)

        const { submittedReason, contractID } = input
        span?.setAttribute('mcreview.contract_id', contractID)
        //Set updateInfo default to initial submission
        const updateInfo: UpdateInfoType = {
            updatedAt: new Date(),
            updatedBy: context.user,
            updatedReason: 'Initial submission',
        }

        // This resolver is only callable by state users
        if (!isStateUser(user)) {
            logError(
                'submitContract',
                'user not authorized to fetch state data'
            )
            setErrorAttributesOnActiveSpan(
                'user not authorized to fetch state data',
                span
            )
            throw new ForbiddenError('user not authorized to fetch state data')
        }
        const stateFromCurrentUser: State['code'] = user.stateCode

        // fetch contract and related rates
        // this could be replaced with parsing to locked versus unlocked contracts and rates when types are available
        const contractWithHistory = await store.findContractWithHistory(
            input.contractID
        )

        if (contractWithHistory instanceof Error) {
            const errMessage = `Issue finding a contract with history with id ${input.contractID}. Message: ${contractWithHistory.message}`
            logError('fetchContract', errMessage)
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

        // Validate user authorized to fetch state
        if (contractWithHistory.stateCode !== stateFromCurrentUser) {
            logError(
                'submitContract',
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
        const initialFormData = contractWithHistory.draftRevision.formData
        const contractRevisionID = contractWithHistory.draftRevision.id
        const draftRatesWithoutLinkedRates =
            contractWithHistory.draftRates?.filter((rate) => {
                return rate.draftRevision?.formData
            })

        // Remove fields from edits on irrelevant logic branches
        // - CHIP_ONLY population covered should not contain any provision or authority relevant to other population.
        // - We delete at submission instead of update to preserve rates data in case user did not
        // intend or would like to revert the submission type before submitting.
        if (isCHIPOnly(contractWithHistory)) {
            // remove invalid provisions
            if (isContractWithProvisions(contractWithHistory)) {
                const validProvisionsKeys =
                    generateApplicableProvisionsList(contractWithHistory)
                const validProvisionsData: Partial<GeneralizedModifiedProvisions> =
                    {}
                validProvisionsKeys.forEach((provision) => {
                    contractWithHistory.draftRevision!.formData[provision] =
                        validProvisionsData[provision]
                })
            }

            contractWithHistory.draftRevision.formData.federalAuthorities =
                contractWithHistory.draftRevision.formData.federalAuthorities.filter(
                    (authority) =>
                        federalAuthorityKeysForCHIP.includes(
                            authority as CHIPFederalAuthority
                        )
                )
        }

        const contractToParse = Object.assign({}, contractWithHistory)

        contractToParse.draftRates = draftRatesWithoutLinkedRates
        const parsedContract = parseContract(
            contractToParse,
            contractWithHistory.stateCode,
            store,
            featureFlags
        )
        if (parsedContract instanceof Error) {
            const errMessage = parsedContract.message
            logError('submitContract', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new UserInputError(errMessage, {
                message: parsedContract.message,
            })
        }
        // add all rates (including any linked rates) back in
        parsedContract.draftRates = contractWithHistory.draftRates
        const parsedSubmissionType =
            parsedContract.draftRevision?.formData.submissionType

        // If this contract is being submitted as CONTRACT_ONLY but still has associations with rates
        // we need to prune those rates at submission time to make the submission clean
        if (
            parsedSubmissionType === 'CONTRACT_ONLY' &&
            parsedContract.draftRates &&
            parsedContract.draftRates.length > 0
        ) {
            const rateUpdates: UpdateDraftContractRatesArgsType = {
                contractID: parsedContract.id,
                rateUpdates: {
                    create: [],
                    update: [],
                    link: [],
                    unlink: [],
                    delete: [],
                },
            }

            for (const draftRate of parsedContract.draftRates) {
                if (draftRate.revisions.length === 0) {
                    if (draftRate.parentContractID !== parsedContract.id) {
                        console.error(
                            'This never submitted rate is not parented to this contract',
                            parsedContract.id,
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
                logError('submitContract', errMessage)
                setErrorAttributesOnActiveSpan(errMessage, span)
                throw new Error(errMessage)
            }
        }

        //Contract and rates rate verification
        if (parsedSubmissionType === 'CONTRACT_AND_RATES') {
            //Ensure a contract and rates contract includes rates
            if (
                !parsedContract.draftRates ||
                parsedContract.draftRates.length === 0
            ) {
                const errMessage = `Attempted to submit a contract and rates contract without rates: ${parsedContract.id}`
                logError('submitContract', errMessage)
                setErrorAttributesOnActiveSpan(errMessage, span)
                throw new UserInputError(errMessage, {
                    argumentName: 'contractID',
                    cause: 'BAD_USER_INPUT',
                })
            }

            //Ensure included rates are in a valid state
            if (
                parsedContract.draftRates &&
                parsedContract.draftRates.length > 0
            ) {
                for (const draftRate of parsedContract.draftRates) {
                    if (['WITHDRAWN'].includes(draftRate.consolidatedStatus)) {
                        const errMessage = `Attempted to submit a contract with a withdrawn rate. Rate id: ${draftRate.id}`
                        logError('submitContract', errMessage)
                        setErrorAttributesOnActiveSpan(errMessage, span)
                        throw new UserInputError(errMessage, {
                            argumentName: 'rateID',
                            cause: 'INVALID_PACKAGE_STATUS',
                        })
                    }
                }
            }
        }

        const updateResult = await store.updateDraftContractWithRates({
            contractID: input.contractID,
            formData: {
                ...initialFormData,
                managedCareEntities: initialFormData.managedCareEntities,
                stateContacts: initialFormData.stateContacts,
                supportingDocuments: initialFormData.supportingDocuments.map(
                    (doc) => {
                        return {
                            name: doc.name,
                            s3URL: doc.s3URL,
                            sha256: doc.sha256,
                        }
                    }
                ),
                contractDocuments: initialFormData.contractDocuments.map(
                    (doc) => {
                        return {
                            name: doc.name,
                            s3URL: doc.s3URL,
                            sha256: doc.sha256,
                        }
                    }
                ),
            },
        })
        if (updateResult instanceof Error) {
            const errMessage = `Failed to update submitted contract info with ID: ${contractRevisionID}; ${updateResult.message}`
            logError('submitContract', errMessage)
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
            logError('submitContract', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new GraphQLError(errMessage, {
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                    cause: 'DB_ERROR',
                },
            })
        }

        // Generate zips!
        if (submitContractResult.packageSubmissions[0]?.contractRevision) {
            const contractRevision =
                submitContractResult.packageSubmissions[0].contractRevision

            // Only attempt to generate zip if there are actually documents to zip
            if (
                contractRevision.formData.contractDocuments &&
                contractRevision.formData.contractDocuments.length > 0
            ) {
                console.info(
                    `Generating zip for ${contractRevision.formData.contractDocuments.length} contract documents for contract revision ${contractRevision.id}`
                )

                const zipResult = await generateContractDocumentsZip(
                    store,
                    contractRevision,
                    span
                )

                if (zipResult instanceof Error) {
                    // We're choosing to log the error but continue with submission
                    // This way, a zip generation failure doesn't block the contract submission
                    logError(
                        'submitContract - contract documents zip generation failed',
                        zipResult
                    )
                    setErrorAttributesOnActiveSpan(
                        'contract documents zip generation failed',
                        span
                    )
                    console.warn(
                        `Contract document zip generation failed for revision ${contractRevision.id}, but continuing with submission process`
                    )
                } else {
                    console.info(
                        `Successfully generated contract document zip for revision ${contractRevision.id}`
                    )
                }
            } else {
                console.info(
                    `No contract documents found for revision ${contractRevision.id}, skipping zip generation`
                )
            }
        }

        // Send emails!
        const status = submitContractResult.status

        let stateAnalystsEmails: string[] = []
        // not great that state code type isn't being used in ContractType but I'll risk the conversion for now
        const stateAnalystsEmailsResult = await store.findStateAssignedUsers(
            submitContractResult.stateCode as StateCodeType
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
            stateAnalystsEmails = stateAnalystsEmailsResult.map((u) => u.email)
        }

        // Get submitter email from every contract submitted revision.
        const submitterEmails = contractSubmitters(submitContractResult)

        const statePrograms = store.findStatePrograms(
            submitContractResult.stateCode
        )

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

        let cmsContractEmailResult
        let stateContractEmailResult

        if (status === 'RESUBMITTED') {
            cmsContractEmailResult = await emailer.sendResubmittedCMSEmail(
                submitContractResult,
                updateInfo,
                stateAnalystsEmails,
                statePrograms
            )
            stateContractEmailResult = await emailer.sendResubmittedStateEmail(
                submitContractResult,
                updateInfo,
                submitterEmails,
                statePrograms
            )
        } else if (status === 'SUBMITTED') {
            cmsContractEmailResult = await emailer.sendCMSNewContract(
                submitContractResult,
                stateAnalystsEmails,
                statePrograms
            )
            stateContractEmailResult = await emailer.sendStateNewContract(
                submitContractResult,
                submitterEmails,
                statePrograms
            )
        }

        if (
            cmsContractEmailResult instanceof Error ||
            stateContractEmailResult instanceof Error
        ) {
            if (cmsContractEmailResult instanceof Error) {
                logError(
                    'submitContract - CMS email failed',
                    cmsContractEmailResult
                )
                setErrorAttributesOnActiveSpan('CMS email failed', span)
            }
            if (stateContractEmailResult instanceof Error) {
                logError(
                    'submitContract - state email failed',
                    stateContractEmailResult
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

        logSuccess('submitContract')
        setSuccessAttributesOnActiveSpan(span)
        return { contract: submitContractResult }
    }
}

/**
 * Helper function to generate and store zip files for contract documents
 *
 * @param store Prisma store instance
 * @param contractRevision The contract revision with documents to zip
 * @param span Optional OpenTelemetry span for tracing
 * @returns void if successful, Error if something failed
 */
export async function generateContractDocumentsZip(
    store: Store,
    contractRevision: ContractRevisionType,
    span?: Span
): Promise<void | Error> {
    const contractRevisionID = contractRevision.id
    const contractDocuments = contractRevision.formData.contractDocuments

    if (!contractDocuments || contractDocuments.length === 0) {
        // No documents to zip
        return
    }

    try {
        // Create an S3 key (destination path) for the zip file. This is where
        // we are storing it in the S3 bucket.
        const s3DestinationKey = `zips/contracts/${contractRevisionID}/contract-documents.zip`

        // Generate the zip file and upload it to S3
        const zipResult = await generateDocumentZip(
            contractDocuments,
            s3DestinationKey
        )

        if (zipResult instanceof Error) {
            // Return the error to the caller
            logError('generateContractDocumentsZip', zipResult)
            if (span) {
                setErrorAttributesOnActiveSpan(
                    'contract documents zip generation failed',
                    span
                )
            }
            return zipResult
        }

        // Store zip information in database
        const createResult = await store.createDocumentZipPackage({
            s3URL: zipResult.s3URL,
            sha256: zipResult.sha256,
            contractRevisionID,
            documentType: 'CONTRACT_DOCUMENTS',
        })

        if (createResult instanceof Error) {
            logError(
                'generateContractDocumentsZip - database storage failed',
                createResult
            )
            if (span) {
                setErrorAttributesOnActiveSpan(
                    'contract documents zip database storage failed',
                    span
                )
            }
            return createResult
        }

        console.info(
            `Successfully generated zip for contract documents: ${zipResult.s3URL}`
        )
        return
    } catch (error: unknown) {
        const errorMessage =
            error instanceof Error ? error.message : String(error)
        const err = new Error(
            `Unexpected error in generateContractDocumentsZip: ${errorMessage}`
        )
        logError('generateContractDocumentsZip', err)
        if (span) {
            setErrorAttributesOnActiveSpan(
                'contract documents zip generation failed',
                span
            )
        }
        return err
    }
}
