import type { Emailer } from '../../emailer'
import type { LDService } from '../../launchDarkly/launchDarkly'
import type { EmailParameterStore } from '../../parameterStore'
import type { Store } from '../../postgres'
import { NotFoundError } from '../../postgres'
import { logError, logSuccess } from '../../logger'
import { isStateUser, contractSubmitters } from '../../domain-models'
import {
    type CHIPFederalAuthority,
    federalAuthorityKeysForCHIP,
} from '../../common-code/healthPlanFormDataType'
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
import type { StateCodeType } from '../../common-code/healthPlanFormDataType'
import type { Span } from '@opentelemetry/api'
import {
    isContractWithProvisions,
    isCHIPOnly,
    generateApplicableProvisionsList,
} from '../../common-code/contractAndRates/contractData'
import type { GeneralizedModifiedProvisions } from '../../common-code/contractAndRates/ModifiedProvisions'

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
    emailParameterStore: EmailParameterStore,
    launchDarkly: LDService
): MutationResolvers['submitContract'] {
    return async (parent, { input }, context) => {
        const featureFlags = await launchDarkly.allFlags(context)
        const readStateAnalystsFromDBFlag =
            featureFlags?.['read-write-state-assignments']

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

        // fetch contract and related reates - convert to HealthPlanPackage and proto-ize to match the pattern for flag off\
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
        // - CONTRACT_ONLY submission type should not contain any CONTRACT_AND_RATE rates data.
        // - CHIP_ONLY population covered should not contain any provision or authority relevant to other population.
        // - We delete at submission instead of update to preserve rates data in case user did not
        // intend or would like to revert the submission type before submitting.
        if (
            contractWithHistory.draftRevision?.formData.submissionType ===
            'CONTRACT_ONLY'
        ) {
            contractWithHistory.draftRates = []
        }

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

        const contractToParse = contractWithHistory
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

        // If this contract is being submitted as CONTRACT_ONLY but still has associations with rates
        // we need to prune those rates at submission time to make the submission clean
        if (
            parsedContract.draftRevision?.formData.submissionType ===
                'CONTRACT_ONLY' &&
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

        // Send emails!
        const status = submitContractResult.status

        let stateAnalystsEmails: string[] = []
        if (readStateAnalystsFromDBFlag) {
            // not great that state code type isn't being used in ContractType but I'll risk the conversion for now
            const stateAnalystsEmailsResult =
                await store.findStateAssignedUsers(
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
                stateAnalystsEmails = stateAnalystsEmailsResult.map(
                    (u) => u.email
                )
            }
        } else {
            const stateAnalystsEmailsResult =
                await emailParameterStore.getStateAnalystsEmails(
                    submitContractResult.stateCode
                )

            //If error log it and set stateAnalystsEmails to empty string as to not interrupt the emails.
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
                stateAnalystsEmails = stateAnalystsEmailsResult
            }
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
