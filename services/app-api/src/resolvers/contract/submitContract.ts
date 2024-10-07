import type { Emailer } from '../../emailer'
import type { LDService } from '../../launchDarkly/launchDarkly'
import type { EmailParameterStore } from '../../parameterStore'
import type { Store } from '../../postgres'
import { NotFoundError } from '../../postgres'
import { logError, logSuccess } from '../../logger'
import {
    isStateUser,
    packageStatus,
    contractSubmitters,
} from '../../domain-models'

import { ForbiddenError, UserInputError } from 'apollo-server-lambda'
import { GraphQLError } from 'graphql'
import { submitHealthPlanPackageResolver } from '../healthPlanPackage'
import {
    setResolverDetailsOnActiveSpan,
    setErrorAttributesOnActiveSpan,
    setSuccessAttributesOnActiveSpan,
} from '../attributeHelper'
import type { MutationResolvers, State } from '../../gen/gqlServer'

import { UpdateInfoType } from '../../domain-models'
import { UpdateInformation } from '../../gen/gqlClient'
import { UpdateDraftContractRatesArgsType } from '../../postgres/contractAndRates/updateDraftContractRates'
import { StateCodeType } from '../../common-code/healthPlanFormDataType'
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
        const span = tracer?.startSpan('submitHealthPlanPackage', {}, ctx)
        setResolverDetailsOnActiveSpan('submitHealthPlanPackage', user, span)

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
                'submitHealthPlanPackage',
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

        // Validate user authorized to fetch state
        if (contractWithHistory.stateCode !== stateFromCurrentUser) {
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

        // validateStatusAndUpdateInfo(
        //     contractWithHistory.status,
        //     updateInfo,
        //     span,
        //     submittedReason || undefined
        // )

        if (!contractWithHistory.draftRevision) {
            throw new Error(
                'PROGRAMMING ERROR: Status should not be submittable without a draft revision'
            )
        }
        const initialFormData = contractWithHistory.draftRevision.formData
        const contractRevisionID = contractWithHistory.draftRevision.id

        // Clear out linked rates from initial data before parse and submit. 
        // We should not validate on the linked rates at all (besides there being at least one rate)
        const childRateIDs =
            contractWithHistory.draftRates?.reduce<string[]>(
                (rateIDs, rate) => {
                    if (
                        rate.id &&
                        rate.parentContractID === contractWithHistory.id
                    ) {
                        rateIDs.push(rate.id)
                    }
                    return rateIDs
                },
                []
            ) ?? []

        const onlyChildRateInfos = contractWithHistory.draftRates?.filter(
            (rateInfo) => {
                return rateInfo.id && childRateIDs.includes(rateInfo.id)
            }
        )

        const formDataNoLinkedRates = {
            ...initialFormData,
            rateInfos: onlyChildRateInfos,
        }

        ///////////// parse and submit
        ///////////// Submission Error check
        // If this contract is being submitted as CONTRACT_ONLY but still has associations with rates
        // we need to prune those rates at submission time to make the submission clean
        if (
            contractWithHistory.draftRevision.formData.submissionType ===
                'CONTRACT_ONLY' &&
            contractWithHistory.draftRates &&
            contractWithHistory.draftRates.length > 0
        ) {
            const rateUpdates: UpdateDraftContractRatesArgsType = {
                contractID: contractWithHistory.id,
                rateUpdates: {
                    create: [],
                    update: [],
                    link: [],
                    unlink: [],
                    delete: [],
                },
            }

            for (const draftRate of contractWithHistory.draftRates) {
                if (draftRate.revisions.length === 0) {
                    if (draftRate.parentContractID !== contractWithHistory.id) {
                        console.error(
                            'This never submitted rate is not parented to this contract',
                            contractWithHistory.id,
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
                logError('submitHealthPlanPackage', errMessage)
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
                supportingDocuments: initialFormData.supportingDocuments.map((doc) => {
                    return {
                        name: doc.name,
                        s3URL: doc.s3URL,
                        sha256: doc.sha256,
                    }
                }),
                contractDocuments: initialFormData.contractDocuments.map((doc) => {
                    return {
                        name: doc.name,
                        s3URL: doc.s3URL,
                        sha256: doc.sha256,
                    }
                }),
            },
        })
        if (updateResult instanceof Error) {
            const errMessage = `Failed to update submitted contract info with ID: ${contractRevisionID}; ${updateResult.message}`
            logError('submitHealthPlanPackage', errMessage)
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
            logError('submitHealthPlanPackage', errMessage)
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

        const statePrograms = store.findStatePrograms(submitContractResult.stateCode)

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
                updateResult,
                updateInfo,
                stateAnalystsEmails,
                statePrograms
            )
            stateContractEmailResult = await emailer.sendResubmittedStateEmail(
                updateResult,
                updateInfo,
                submitterEmails,
                statePrograms
            )
        } else if (status === 'SUBMITTED') {
            cmsContractEmailResult = await emailer.sendCMSNewContract(
                updateResult,
                stateAnalystsEmails,
                statePrograms
            )
            stateContractEmailResult = await emailer.sendStateNewContract(
                updateResult,
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
                    'submitHealthPlanPackage - CMS email failed',
                    cmsContractEmailResult
                )
                setErrorAttributesOnActiveSpan('CMS email failed', span)
            }
            if (stateContractEmailResult instanceof Error) {
                logError(
                    'submitHealthPlanPackage - state email failed',
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
