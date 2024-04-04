import type { Store } from '../../postgres'
import type { MutationResolvers } from '../../gen/gqlServer'
import {
    setErrorAttributesOnActiveSpan,
    setResolverDetailsOnActiveSpan,
} from '../attributeHelper'
import { isStateUser } from '../../domain-models'
import { logError } from '../../logger'
import { ForbiddenError, UserInputError } from 'apollo-server-lambda'
import { NotFoundError } from '../../postgres'
import { GraphQLError } from 'graphql/index'
import type { LDService } from '../../launchDarkly/launchDarkly'
import { generateRateCertificationName } from '../rate/generateRateCertificationName'
import { findStatePrograms } from '../../../../app-web/src/common-code/healthPlanFormDataType/findStatePrograms'
import { nullsToUndefined } from '../../domain-models/nullstoUndefined'

/*
    Submit rate will change a draft revision to submitted and generate a rate name if one is missing
    Also, if form data is passed in (such as on standalone rate edits) the form data itself will be updated
*/
export function submitContract(
    store: Store,
    launchDarkly: LDService
): MutationResolvers['submitContract'] {
    return async (_parent, { input }, context) => {
        const { user, span } = context
        const { contractID, submittedReason, formData } = input
        const featureFlags = await launchDarkly.allFlags(context)
        setResolverDetailsOnActiveSpan('submitContract', user, span)
        span?.setAttribute('mcreview.contract_id', contractID)

        // throw error if the feature flag is off
        if (!featureFlags?.['rate-edit-unlock']) {
            const errMessage = `Not authorized to edit and submit a rate independently, the feature is disabled`
            logError('submitContract', errMessage)
            throw new ForbiddenError(errMessage, {
                message: errMessage,
            })
        }

        // This resolver is only callable by State users
        if (!isStateUser(user)) {
            const errMessage = 'user not authorized to submit rate'
            logError('submitContract', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new ForbiddenError(errMessage)
        }

        // find the contract to submit
        const unsubmittedContract = await store.findContractWithHistory(contractID)
        if (unsubmittedContract instanceof Error) {
            if (unsubmittedContract instanceof NotFoundError) {
                const errMessage = `A rate must exist to be submitted: ${contractID}`
                logError('submitContract', errMessage)
                setErrorAttributesOnActiveSpan(errMessage, span)
                throw new UserInputError(errMessage, {
                    argumentName: 'contractID',
                })
            }

            logError('submitContract', unsubmittedContract.message)
            setErrorAttributesOnActiveSpan(unsubmittedContract.message, span)
            throw new GraphQLError(unsubmittedContract.message, {
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                    cause: 'DB_ERROR',
                },
            })
        }

        // const draftRevision = unsubmittedContract.draftRevision

        // if (!draftRevision) {
        //     throw new Error(
        //         'PROGRAMMING ERROR: Status should not be submittable without a draft rate revision'
        //     )
        // }

        // make sure it is draft or unlocked
        if (
            unsubmittedContract.status === 'SUBMITTED' ||
            unsubmittedContract.status === 'RESUBMITTED'
        ) {
            const errMessage = `Attempted to submit a rate that is already submitted`
            logError('submitContract', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new UserInputError(errMessage, {
                argumentName: 'contractID',
                cause: 'INVALID_PACKAGE_STATUS',
            })
        }

        // prepare to generate rate cert name - either use new form data coming down on submit or unsubmitted submission data already in database
        const stateCode = unsubmittedContract.stateCode
        const stateNumber = unsubmittedContract.stateNumber
        const statePrograms = findStatePrograms(stateCode)
        // const generatedRateCertName = formData
        //     ? generateRateCertificationName(
        //           nullsToUndefined(formData),
        //           stateCode,
        //           stateNumber,
        //           statePrograms
        //       )
        //     : generateRateCertificationName(
        //           draftRevision.formData,
        //           stateCode,
        //           stateNumber,
        //           statePrograms
        //       )

        // combine existing db draft data with any form data added on submit
        // call submit contract handler
        const submittedContract = await store.submitContract({
            contractID,
            submittedByUserID: user.id,
            submittedReason: submittedReason ?? 'Initial submission',
            formData: formData
                ? {
                    contractType: formData.contractType ?? undefined,
                    programIDs: formData.programIDs ?? undefined,
                    populationCovered: formData.populationCovered ?? undefined,
                    submissionType: formData.submissionType ?? undefined,
                    riskBasedContract: formData.riskBasedContract ?? undefined,
                    submissionDescription: formData.submissionDescription ?? undefined,
                    stateContacts: [
                        {
                            name: 'Test Person',
                            titleRole: 'A Role',
                            email: 'test+state+contact@example.com',
                        },
                    ],
                    supportingDocuments: formData.supportingDocuments ?? undefined,
                    contractExecutionStatus: formData.contractExecutionStatus ?? undefined,
                    contractDocuments: formData.contractDocuments ?? undefined,
                    contractDateStart: formData.contractDateStart ?? undefined,
                    contractDateEnd: formData.contractDateEnd ?? undefined,
                    managedCareEntities: formData.managedCareEntities ?? undefined,
                    federalAuthorities: formData.federalAuthorities ?? undefined,
                    inLieuServicesAndSettings: formData.inLieuServicesAndSettings ?? undefined,
                    modifiedBenefitsProvided: formData.modifiedBenefitsProvided ?? undefined,
                    modifiedGeoAreaServed: formData.modifiedGeoAreaServed ?? undefined,
                    modifiedMedicaidBeneficiaries: formData.modifiedMedicaidBeneficiaries ?? undefined,
                    modifiedRiskSharingStrategy: formData.modifiedRiskSharingStrategy ?? undefined,
                    modifiedIncentiveArrangements: formData.modifiedIncentiveArrangements ?? undefined,
                    modifiedWitholdAgreements: formData.modifiedWitholdAgreements ?? undefined,
                    modifiedStateDirectedPayments: formData.modifiedStateDirectedPayments ?? undefined,
                    modifiedPassThroughPayments: formData.modifiedPassThroughPayments ?? undefined,
                    modifiedPaymentsForMentalDiseaseInstitutions: formData.modifiedPaymentsForMentalDiseaseInstitutions ?? undefined,
                    modifiedMedicalLossRatioStandards: formData.modifiedMedicalLossRatioStandards ?? undefined,
                    modifiedOtherFinancialPaymentIncentive: formData.modifiedOtherFinancialPaymentIncentive ?? undefined,
                    modifiedEnrollmentProcess: formData.modifiedEnrollmentProcess ?? undefined,
                    modifiedGrevienceAndAppeal: formData.modifiedGrevienceAndAppeal ?? undefined,
                    modifiedNetworkAdequacyStandards: formData.modifiedNetworkAdequacyStandards ?? undefined,
                    modifiedLengthOfContract: formData.modifiedLengthOfContract ?? undefined,
                    modifiedNonRiskPaymentArrangements: formData.modifiedNonRiskPaymentArrangements ?? undefined,
                    statutoryRegulatoryAttestation: formData.statutoryRegulatoryAttestation ?? undefined,
                    statutoryRegulatoryAttestationDescription: formData.statutoryRegulatoryAttestationDescription ?? undefined,
                } : undefined,
        })

        if (submittedContract instanceof Error) {
            const errMessage = `Failed to submit rate with ID: ${contractID}; ${submittedContract.message}`
            logError('submitContract', errMessage)
            setErrorAttributesOnActiveSpan(errMessage, span)
            throw new GraphQLError(errMessage, {
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                    cause: 'DB_ERROR',
                },
            })
        }

        return {
            contract: submittedContract,
        }
    }
}
