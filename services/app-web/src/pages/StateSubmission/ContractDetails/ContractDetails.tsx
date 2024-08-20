import React, { useState } from 'react'
import dayjs from 'dayjs'
import {
    Form as UswdsForm,
    FormGroup,
    Fieldset,
    DateRangePicker,
    Link,
} from '@trussworks/react-uswds'
import { v4 as uuidv4 } from 'uuid'
import { generatePath, useNavigate } from 'react-router-dom'
import { Formik, FormikErrors, getIn } from 'formik'
import styles from '../StateSubmissionForm.module.scss'

import {
    FileUpload,
    FileItemT,
    FieldRadio,
    FieldCheckbox,
    ErrorSummary,
    PoliteErrorMessage,
    FieldYesNo,
    FieldTextarea,
    DynamicStepIndicator,
    LinkWithLogging,
    ReactRouterLinkWithLogging,
} from '../../../components'
import {
    formatForForm,
    formatUserInputDate,
    isDateRangeEmpty,
} from '../../../formHelpers'
import { useS3 } from '../../../contexts/S3Context'

import { ContractDetailsFormSchema } from './ContractDetailsSchema'
import {
    ManagedCareEntityRecord,
    FederalAuthorityRecord,
} from '../../../constants/healthPlanPackages'
import { PageActions } from '../PageActions'
import {
    activeFormPages,
    type HealthPlanFormPageProps,
} from '../StateSubmissionForm'
import { formatYesNoForProto, formatDocumentsForGQL, formatDocumentsForForm, formatFormDateForGQL } from '../../../formHelpers/formatters'
import { ACCEPTED_SUBMISSION_FILE_TYPES } from '../../../components/FileUpload'
import {
    federalAuthorityKeysForCHIP,
    federalAuthorityKeys,
} from '../../../common-code/healthPlanFormDataType'
import {
    generateProvisionLabel,
    generateApplicableProvisionsList,
} from '../../../common-code/ContractTypeProvisions'
import type {
    ManagedCareEntity,
    SubmissionDocument,
    ContractExecutionStatus,
    FederalAuthority,
} from '../../../common-code/healthPlanFormDataType'
import {
    isBaseContract,
    isCHIPOnly,
    isContractAmendment,
    isContractWithProvisions,
} from '../../../common-code/ContractType'
import { RoutesRecord } from '../../../constants'
import { useLDClient } from 'launchdarkly-react-client-sdk'
import { featureFlags } from '../../../common-code/featureFlags'
import {
    booleanAsYesNoFormValue,
    yesNoFormValueAsBoolean,
} from '../../../components/Form/FieldYesNo/FieldYesNo'
import {
    StatutoryRegulatoryAttestation,
    StatutoryRegulatoryAttestationDescription,
    StatutoryRegulatoryAttestationQuestion,
} from '../../../constants/statutoryRegulatoryAttestation'
import { FormContainer } from '../FormContainer'
import {
    useCurrentRoute,
    useRouteParams,
} from '../../../hooks'
import { useAuth } from '../../../contexts/AuthContext'
import { ErrorOrLoadingPage } from '../ErrorOrLoadingPage'
import { PageBannerAlerts } from '../PageBannerAlerts'
import { useErrorSummary } from '../../../hooks/useErrorSummary'
import { useContractForm } from '../../../hooks/useContractForm'
import { UpdateContractDraftRevisionInput, ContractDraftRevisionFormDataInput, ContractRevision } from '../../../gen/gqlClient'

function formattedDatePlusOneDay(initialValue: string): string {
    const dayjsValue = dayjs(initialValue)
    return initialValue && dayjsValue.isValid()
        ? dayjsValue.add(1, 'day').format('YYYY-MM-DD')
        : initialValue // preserve undefined to show validations later
}

function formattedDateMinusOneDay(initialValue: string): string {
    const dayjsValue = dayjs(initialValue)
    return initialValue && dayjsValue.isValid()
        ? dayjsValue.subtract(1, 'day').format('YYYY-MM-DD')
        : initialValue // preserve undefined to show validations later
}

const ContractDatesErrorMessage = ({
    values,
    validationErrorMessage,
    formFieldLabel,
}: {
    values: ContractDetailsFormValues
    validationErrorMessage: string
    formFieldLabel: string
}): React.ReactElement => (
    <PoliteErrorMessage formFieldLabel={formFieldLabel}>
        {isDateRangeEmpty(values.contractDateStart, values.contractDateEnd)
            ? 'You must provide a start and an end date'
            : validationErrorMessage}
    </PoliteErrorMessage>
)

export type ContractDetailsFormValues = {
    contractDocuments: FileItemT[]
    supportingDocuments: FileItemT[]
    contractExecutionStatus: ContractExecutionStatus | undefined
    contractDateStart: string
    contractDateEnd: string
    managedCareEntities: ManagedCareEntity[]
    federalAuthorities: FederalAuthority[]
    inLieuServicesAndSettings: string | undefined
    modifiedBenefitsProvided: string | undefined
    modifiedGeoAreaServed: string | undefined
    modifiedMedicaidBeneficiaries: string | undefined
    modifiedRiskSharingStrategy: string | undefined
    modifiedIncentiveArrangements: string | undefined
    modifiedWitholdAgreements: string | undefined
    modifiedStateDirectedPayments: string | undefined
    modifiedPassThroughPayments: string | undefined
    modifiedPaymentsForMentalDiseaseInstitutions: string | undefined
    modifiedMedicalLossRatioStandards: string | undefined
    modifiedOtherFinancialPaymentIncentive: string | undefined
    modifiedEnrollmentProcess: string | undefined
    modifiedGrevienceAndAppeal: string | undefined
    modifiedNetworkAdequacyStandards: string | undefined
    modifiedLengthOfContract: string | undefined
    modifiedNonRiskPaymentArrangements: string | undefined
    statutoryRegulatoryAttestation: string | undefined
    statutoryRegulatoryAttestationDescription: string | undefined
}
export type FormError =
    FormikErrors<ContractDetailsFormValues>[keyof FormikErrors<ContractDetailsFormValues>]

export const ContractDetails = ({
    showValidations = false,
}: HealthPlanFormPageProps): React.ReactElement => {
    const [shouldValidate, setShouldValidate] = React.useState(showValidations)
    const navigate = useNavigate()
    const ldClient = useLDClient()
    const { setFocusErrorSummaryHeading, errorSummaryHeadingRef } =
        useErrorSummary()
    // const { errors } = useFormikContext<ContractDetailsFormValues>()

    // set up API handling and HPP data
    const { loggedInUser } = useAuth()
    const { currentRoute } = useCurrentRoute()
    const { id } = useRouteParams()
    const {
        draftSubmission,
        interimState,
        updateDraft,
        previousDocuments,
        showPageErrorMessage,
    } = useContractForm(id)

    const contract438Attestation = ldClient?.variation(
        featureFlags.CONTRACT_438_ATTESTATION.flag,
        featureFlags.CONTRACT_438_ATTESTATION.defaultValue
    )

    // Contract documents state management
    const { getKey, handleDeleteFile, handleUploadFile, handleScanFile } = useS3()
    if (interimState || !draftSubmission)
        return <ErrorOrLoadingPage state={interimState || 'GENERIC_ERROR'} />
    
    const fileItemsFromDraftSubmission: FileItemT[] | undefined =
        draftSubmission &&
        draftSubmission.draftRevision?.formData.contractDocuments.map((doc) => {
            const key = getKey(doc.s3URL)
            if (!key) {
                return {
                    id: uuidv4(),
                    name: doc.name,
                    key: 'INVALID_KEY',
                    s3URL: undefined,
                    status: 'UPLOAD_ERROR',
                    sha256: doc.sha256,
                    dateAdded: doc.dateAdded,
                }
            }
            return {
                id: uuidv4(),
                name: doc.name,
                key: key,
                s3URL: doc.s3URL,
                status: 'UPLOAD_COMPLETE',
                sha256: doc.sha256,
                dateAdded: doc.dateAdded
            }
        })

    const applicableProvisions =
        generateApplicableProvisionsList(draftSubmission)

    const applicableFederalAuthorities = isCHIPOnly(draftSubmission)
        ? federalAuthorityKeysForCHIP
        : federalAuthorityKeys

    const contractDetailsInitialValues: ContractDetailsFormValues = {
        contractDocuments: formatDocumentsForForm({
            documents: draftSubmission?.draftRevision?.formData.contractDocuments,
            getKey: getKey,
        }),
        supportingDocuments: formatDocumentsForForm({
            documents: draftSubmission?.draftRevision?.formData.supportingDocuments,
            getKey: getKey,
        }),
        contractExecutionStatus:
            draftSubmission?.draftRevision?.formData.contractExecutionStatus ?? undefined,
        contractDateStart:
            (draftSubmission &&
                formatForForm(draftSubmission.draftRevision?.formData.contractDateStart)) ??
            '',
        contractDateEnd:
            (draftSubmission &&
                formatForForm(draftSubmission.draftRevision?.formData.contractDateEnd)) ??
            '',
        managedCareEntities:
            (draftSubmission?.draftRevision?.formData.managedCareEntities as ManagedCareEntity[]) ?? [],
        federalAuthorities: draftSubmission?.draftRevision?.formData.federalAuthorities ?? [],
        inLieuServicesAndSettings: booleanAsYesNoFormValue(
            draftSubmission?.draftRevision?.formData.inLieuServicesAndSettings ===
                null
                ? undefined
                : draftSubmission?.draftRevision?.formData.inLieuServicesAndSettings
        ) ?? '',
        modifiedBenefitsProvided: booleanAsYesNoFormValue(
            draftSubmission?.draftRevision?.formData.modifiedBenefitsProvided ===
                null
                ? undefined
                : draftSubmission?.draftRevision?.formData.modifiedBenefitsProvided
        ) ?? '',
        modifiedGeoAreaServed: booleanAsYesNoFormValue(
            draftSubmission?.draftRevision?.formData.modifiedGeoAreaServed ===
                null
                ? undefined
                : draftSubmission?.draftRevision?.formData.modifiedGeoAreaServed
        ) ?? '',
        modifiedMedicaidBeneficiaries: booleanAsYesNoFormValue(
            draftSubmission?.draftRevision?.formData.modifiedMedicaidBeneficiaries ===
                null
                ? undefined
                : draftSubmission?.draftRevision?.formData.modifiedMedicaidBeneficiaries
        ) ?? '',
        modifiedRiskSharingStrategy: booleanAsYesNoFormValue(
            draftSubmission?.draftRevision?.formData.modifiedRiskSharingStrategy ===
                null
                ? undefined
                : draftSubmission?.draftRevision?.formData.modifiedRiskSharingStrategy
        ) ?? '',
        modifiedIncentiveArrangements: booleanAsYesNoFormValue(
            draftSubmission?.draftRevision?.formData.modifiedIncentiveArrangements ===
                null
                ? undefined
                : draftSubmission?.draftRevision?.formData.modifiedIncentiveArrangements
        ) ?? '',
        modifiedWitholdAgreements: booleanAsYesNoFormValue(
            draftSubmission?.draftRevision?.formData.modifiedWitholdAgreements ===
                null
                ? undefined
                : draftSubmission?.draftRevision?.formData.modifiedWitholdAgreements
        ) ?? '',
        modifiedStateDirectedPayments: booleanAsYesNoFormValue(
            draftSubmission?.draftRevision?.formData.modifiedStateDirectedPayments ===
                null
                ? undefined
                : draftSubmission?.draftRevision?.formData.modifiedStateDirectedPayments
        ) ?? '',
        modifiedPassThroughPayments: booleanAsYesNoFormValue(
            draftSubmission?.draftRevision?.formData.modifiedPassThroughPayments ===
                null
                ? undefined
                : draftSubmission?.draftRevision?.formData.modifiedPassThroughPayments
        ) ?? '',
        modifiedPaymentsForMentalDiseaseInstitutions: booleanAsYesNoFormValue(
            draftSubmission?.draftRevision?.formData.modifiedPaymentsForMentalDiseaseInstitutions ===
                null
                ? undefined
                : draftSubmission?.draftRevision?.formData.modifiedPaymentsForMentalDiseaseInstitutions
        ) ?? '',
        modifiedMedicalLossRatioStandards: booleanAsYesNoFormValue(
            draftSubmission?.draftRevision?.formData.modifiedMedicalLossRatioStandards ===
                null
                ? undefined
                : draftSubmission?.draftRevision?.formData.modifiedMedicalLossRatioStandards
        ) ?? '',
        modifiedOtherFinancialPaymentIncentive: booleanAsYesNoFormValue(
            draftSubmission?.draftRevision?.formData.modifiedOtherFinancialPaymentIncentive ===
                null
                ? undefined
                : draftSubmission?.draftRevision?.formData.modifiedOtherFinancialPaymentIncentive
        ) ?? '',
        modifiedEnrollmentProcess: booleanAsYesNoFormValue(
            draftSubmission?.draftRevision?.formData.modifiedEnrollmentProcess ===
                null
                ? undefined
                : draftSubmission?.draftRevision?.formData.modifiedEnrollmentProcess
        ) ?? '',
        modifiedGrevienceAndAppeal: booleanAsYesNoFormValue(
            draftSubmission?.draftRevision?.formData.modifiedGrevienceAndAppeal ===
                null
                ? undefined
                : draftSubmission?.draftRevision?.formData.modifiedGrevienceAndAppeal
        ) ?? '',
        modifiedNetworkAdequacyStandards: booleanAsYesNoFormValue(
            draftSubmission?.draftRevision?.formData.modifiedNetworkAdequacyStandards ===
                null
                ? undefined
                : draftSubmission?.draftRevision?.formData.modifiedNetworkAdequacyStandards
        ) ?? '',
        modifiedLengthOfContract: booleanAsYesNoFormValue(
            draftSubmission?.draftRevision?.formData.modifiedLengthOfContract ===
                null
                ? undefined
                : draftSubmission?.draftRevision?.formData.modifiedLengthOfContract
        ) ?? '',
        modifiedNonRiskPaymentArrangements: booleanAsYesNoFormValue(
            draftSubmission?.draftRevision?.formData.modifiedNonRiskPaymentArrangements ===
                null
                ? undefined
                : draftSubmission?.draftRevision?.formData.modifiedNonRiskPaymentArrangements
        ) ?? '',
        statutoryRegulatoryAttestation: booleanAsYesNoFormValue(
            draftSubmission?.draftRevision?.formData.statutoryRegulatoryAttestation ===
                null
                ? undefined
                : draftSubmission?.draftRevision?.formData.statutoryRegulatoryAttestation
        ) ?? '',
        statutoryRegulatoryAttestationDescription: draftSubmission?.draftRevision?.formData.statutoryRegulatoryAttestationDescription ?? '',
    }

    const showFieldErrors = (
        fieldName: keyof ContractDetailsFormValues,
        errors:any
    ): string | undefined => {
        if (!shouldValidate) return undefined
        return getIn(errors, `${fieldName}`)
    }
    const handleFormSubmit = async (
        values: ContractDetailsFormValues,
        setSubmitting: (isSubmitting: boolean) => void, // formik setSubmitting
        options: {
            shouldValidateDocuments: boolean
            redirectPath: string
        }
    ) => {
        let updatedDraftSubmissionFormData: ContractDraftRevisionFormDataInput = {
            contractExecutionStatus: values.contractExecutionStatus,
            contractDateStart: formatFormDateForGQL(
                values.contractDateStart
            ),
            contractDateEnd: formatFormDateForGQL(
                values.contractDateEnd
            ),
            riskBasedContract: draftSubmission.draftRevision?.formData.riskBasedContract,
            populationCovered: draftSubmission.draftRevision?.formData.populationCovered,
            programIDs: draftSubmission.draftRevision?.formData.programIDs || [],
            stateContacts: draftSubmission.draftRevision?.formData.stateContacts || [],
            contractDocuments: formatDocumentsForGQL(values.contractDocuments) || [],
            supportingDocuments: formatDocumentsForGQL(values.supportingDocuments) || [],
            managedCareEntities: values.managedCareEntities,
            federalAuthorities: values.federalAuthorities,
            submissionType: draftSubmission.draftRevision?.formData.submissionType,
            statutoryRegulatoryAttestation: formatYesNoForProto(
                values.statutoryRegulatoryAttestation
            ),
            // If contract is in compliance, we set the description to undefined. This clears out previous non-compliance description
            statutoryRegulatoryAttestationDescription: values.statutoryRegulatoryAttestationDescription
        }
        

        if (
            draftSubmission === undefined ||
            !updateDraft ||
            !draftSubmission.draftRevision
        ) {
            console.info(draftSubmission, updateDraft)
            console.info(
                'ERROR, SubmissionType for does not have props needed to update a draft.'
            )
            return
        }
        if (isContractWithProvisions(draftSubmission)) {
            updatedDraftSubmissionFormData.inLieuServicesAndSettings = yesNoFormValueAsBoolean(values.inLieuServicesAndSettings)
            updatedDraftSubmissionFormData.modifiedBenefitsProvided = yesNoFormValueAsBoolean(values.modifiedBenefitsProvided)
            updatedDraftSubmissionFormData.modifiedGeoAreaServed = yesNoFormValueAsBoolean(values.modifiedGeoAreaServed)
            updatedDraftSubmissionFormData.modifiedMedicaidBeneficiaries = yesNoFormValueAsBoolean(values.modifiedMedicaidBeneficiaries)
            updatedDraftSubmissionFormData.modifiedRiskSharingStrategy = yesNoFormValueAsBoolean(values.modifiedRiskSharingStrategy)
            updatedDraftSubmissionFormData.modifiedIncentiveArrangements = yesNoFormValueAsBoolean(values.modifiedIncentiveArrangements)
            updatedDraftSubmissionFormData.modifiedWitholdAgreements = yesNoFormValueAsBoolean(values.modifiedWitholdAgreements)
            updatedDraftSubmissionFormData.modifiedStateDirectedPayments = yesNoFormValueAsBoolean(values.modifiedStateDirectedPayments)
            updatedDraftSubmissionFormData.modifiedPassThroughPayments = yesNoFormValueAsBoolean(values.modifiedPassThroughPayments)
            updatedDraftSubmissionFormData.modifiedPaymentsForMentalDiseaseInstitutions = yesNoFormValueAsBoolean(values.modifiedPaymentsForMentalDiseaseInstitutions)
            updatedDraftSubmissionFormData.modifiedMedicalLossRatioStandards = yesNoFormValueAsBoolean(values.modifiedMedicalLossRatioStandards)
            updatedDraftSubmissionFormData.modifiedOtherFinancialPaymentIncentive = yesNoFormValueAsBoolean(values.modifiedOtherFinancialPaymentIncentive)
            updatedDraftSubmissionFormData.modifiedEnrollmentProcess = yesNoFormValueAsBoolean(values.modifiedEnrollmentProcess)
            updatedDraftSubmissionFormData.modifiedGrevienceAndAppeal = yesNoFormValueAsBoolean(values.modifiedGrevienceAndAppeal)
            updatedDraftSubmissionFormData.modifiedNetworkAdequacyStandards = yesNoFormValueAsBoolean(values.modifiedNetworkAdequacyStandards)
            updatedDraftSubmissionFormData.modifiedLengthOfContract = yesNoFormValueAsBoolean(values.modifiedLengthOfContract)
            updatedDraftSubmissionFormData.modifiedNonRiskPaymentArrangements = yesNoFormValueAsBoolean(values.modifiedNonRiskPaymentArrangements)
        } else {
            updatedDraftSubmissionFormData.inLieuServicesAndSettings = undefined
            updatedDraftSubmissionFormData.modifiedBenefitsProvided = undefined
            updatedDraftSubmissionFormData.modifiedGeoAreaServed = undefined
            updatedDraftSubmissionFormData.modifiedMedicaidBeneficiaries = undefined
            updatedDraftSubmissionFormData.modifiedRiskSharingStrategy = undefined
            updatedDraftSubmissionFormData.modifiedIncentiveArrangements = undefined
            updatedDraftSubmissionFormData.modifiedWitholdAgreements = undefined
            updatedDraftSubmissionFormData.modifiedStateDirectedPayments = undefined
            updatedDraftSubmissionFormData.modifiedPassThroughPayments = undefined
            updatedDraftSubmissionFormData.modifiedPaymentsForMentalDiseaseInstitutions = undefined
            updatedDraftSubmissionFormData.modifiedMedicalLossRatioStandards = undefined
            updatedDraftSubmissionFormData.modifiedOtherFinancialPaymentIncentive = undefined
            updatedDraftSubmissionFormData.modifiedEnrollmentProcess = undefined
            updatedDraftSubmissionFormData.modifiedGrevienceAndAppeal = undefined
            updatedDraftSubmissionFormData.modifiedNetworkAdequacyStandards = undefined
            updatedDraftSubmissionFormData.modifiedLengthOfContract = undefined
            updatedDraftSubmissionFormData.modifiedNonRiskPaymentArrangements = undefined
        }

        try {
            const updatedContract: UpdateContractDraftRevisionInput = {
                formData: updatedDraftSubmissionFormData,
                contractID: draftSubmission.id,
                lastSeenUpdatedAt: draftSubmission.draftRevision.updatedAt
            }

            const updatedSubmission = await updateDraft(updatedContract)
            if (updatedSubmission instanceof Error) {
                setSubmitting(false)
                console.info(
                    'Error updating draft submission: ',
                    updatedSubmission
                )
            } else if (updatedSubmission) {
                navigate(options.redirectPath)
            }
        } catch (serverError) {
            setSubmitting(false)
        } finally {
            setSubmitting(false)
        }
    }

    const formHeading = 'Contract Details Form'

    return (
        <>
            <div>
                <DynamicStepIndicator
                    formPages={activeFormPages(
                        draftSubmission?.draftRevision!.formData
                    )}
                    currentFormPage={currentRoute}
                />
                <PageBannerAlerts
                    loggedInUser={loggedInUser}
                    unlockedInfo={draftSubmission.draftRevision?.unlockInfo}
                    showPageErrorMessage={showPageErrorMessage ?? false}
                />
            </div>
            <FormContainer id="ContactDetails">
                <Formik
                    initialValues={contractDetailsInitialValues}
                    onSubmit={(values, { setSubmitting }) => {
                        return handleFormSubmit(values, setSubmitting, {
                            shouldValidateDocuments: true,
                            redirectPath:
                                draftSubmission.draftRevision?.formData.submissionType ===
                                'CONTRACT_ONLY'
                                    ? `../contacts`
                                    : `../rate-details`,
                        })
                    }}
                    // validationSchema={() =>
                    //     ContractDetailsFormSchema(
                    //         draftSubmission,
                    //         ldClient?.allFlags()
                    //     )
                    // }
                >
                    {({
                        values,
                        errors,
                        handleSubmit,
                        setSubmitting,
                        isSubmitting,
                        setFieldValue,
                    }) => (
                        <>
                            <UswdsForm
                                className={styles.formContainer}
                                id="ContractDetailsForm"
                                aria-label={formHeading}
                                aria-describedby="form-guidance"
                                onSubmit={(e) => {
                                    setShouldValidate(true)
                                    setFocusErrorSummaryHeading(true)
                                    handleSubmit(e)
                                }}
                            >
                                <fieldset className="usa-fieldset">
                                    <legend className="srOnly">
                                        Contract Details
                                    </legend>

                                    {/* {shouldValidate && (
                                        <ErrorSummary
                                            errors={
                                                documentsErrorMessage
                                                    ? {
                                                          [documentsErrorKey]:
                                                              documentsErrorMessage,
                                                          ...errors,
                                                      }
                                                    : errors
                                            }
                                            headingRef={errorSummaryHeadingRef}
                                        />
                                    )} */}

                                    <FormGroup
                                        error={Boolean(showFieldErrors('contractDocuments', errors))}
                                        className="margin-top-0"
                                    >
                                        <FileUpload
                                            id="documents"
                                            name="documents"
                                            label="Upload contract"
                                            aria-required
                                            // error={errors.contractDocuments}
                                            hint={
                                                <span
                                                    className={
                                                        styles.guidanceTextBlock
                                                    }
                                                >
                                                    <LinkWithLogging
                                                        aria-label="Document definitions and requirements (opens in new window)"
                                                        href={
                                                            '/help#key-documents'
                                                        }
                                                        variant="external"
                                                        target="_blank"
                                                    >
                                                        Document definitions and
                                                        requirements
                                                    </LinkWithLogging>
                                                    <span className="padding-top-05">
                                                        Supporting documents can
                                                        be added later. If you
                                                        have additional contract
                                                        actions, you must submit
                                                        them in a separate
                                                        submission.
                                                    </span>
                                                    <span className="padding-top-1">
                                                        This input only accepts
                                                        PDF, CSV, DOC, DOCX,
                                                        XLS, XLSX files.
                                                    </span>
                                                </span>
                                            }
                                            accept={
                                                ACCEPTED_SUBMISSION_FILE_TYPES
                                            }
                                            initialItems={
                                                fileItemsFromDraftSubmission
                                            }
                                            uploadFile={(file) =>
                                                handleUploadFile(file, 'HEALTH_PLAN_DOCS')
                                            }
                                            scanFile={(key) => handleScanFile(key, 'HEALTH_PLAN_DOCS')}
                                            deleteFile={(key) =>
                                                handleDeleteFile(
                                                    key,
                                                    'HEALTH_PLAN_DOCS',
                                                    previousDocuments
                                                )
                                            }
                                            onFileItemsUpdate={({ fileItems }) =>
                                                setFieldValue(
                                                    `contractDocuments`,
                                                    fileItems
                                                )
                                            }
                                        />
                                    </FormGroup>
                                    {contract438Attestation && (
                                        <FormGroup
                                            error={Boolean(showFieldErrors(
                                                'statutoryRegulatoryAttestation',
                                                errors
                                            ))}
                                        >
                                            <Fieldset
                                                role="radiogroup"
                                                aria-required
                                                className={
                                                    styles.contractAttestation
                                                }
                                                legend={
                                                    StatutoryRegulatoryAttestationQuestion
                                                }
                                            >
                                                <div role="note">
                                                    <span
                                                        className={
                                                            styles.requiredOptionalText
                                                        }
                                                    >
                                                        Required
                                                    </span>
                                                    <span>
                                                        <Link
                                                            aria-label="Managed Care Contract Review and Approval State Guide (opens in new window)"
                                                            href={
                                                                'https://www.medicaid.gov/sites/default/files/2022-01/mce-checklist-state-user-guide.pdf'
                                                            }
                                                            variant="external"
                                                            target="_blank"
                                                        >
                                                            Managed Care
                                                            Contract Review and
                                                            Approval State Guide
                                                        </Link>
                                                        <Link
                                                            aria-label="CHIP Managed Care Contract Review and Approval State Guide (opens in new window)"
                                                            href={
                                                                'https://www.medicaid.gov/sites/default/files/2022-04/chip-managed-care-contract-guide_0.pdf'
                                                            }
                                                            variant="external"
                                                            target="_blank"
                                                        >
                                                            CHIP Managed Care
                                                            Contract Review and
                                                            Approval State Guide
                                                        </Link>
                                                    </span>
                                                </div>
                                                {Boolean(showFieldErrors(
                                                    'statutoryRegulatoryAttestation',
                                                    errors
                                                )) && (
                                                    <PoliteErrorMessage
                                                        formFieldLabel={
                                                            StatutoryRegulatoryAttestationQuestion
                                                        }
                                                    >
                                                        {
                                                            errors.statutoryRegulatoryAttestation
                                                        }
                                                    </PoliteErrorMessage>
                                                )}
                                                <FieldRadio
                                                    name="statutoryRegulatoryAttestation"
                                                    label={
                                                        StatutoryRegulatoryAttestation.YES
                                                    }
                                                    id="statutoryRegulatoryAttestationYes"
                                                    value={'YES'}
                                                    aria-required
                                                    list_position={1}
                                                    list_options={2}
                                                    parent_component_heading={
                                                        StatutoryRegulatoryAttestationQuestion
                                                    }
                                                    radio_button_title={
                                                        StatutoryRegulatoryAttestation.YES
                                                    }
                                                />
                                                <FieldRadio
                                                    name="statutoryRegulatoryAttestation"
                                                    label={
                                                        StatutoryRegulatoryAttestation.NO
                                                    }
                                                    id="statutoryRegulatoryAttestationNo"
                                                    value={'NO'}
                                                    aria-required
                                                    list_position={2}
                                                    list_options={2}
                                                    parent_component_heading={
                                                        StatutoryRegulatoryAttestationQuestion
                                                    }
                                                    radio_button_title={
                                                        StatutoryRegulatoryAttestation.NO
                                                    }
                                                />
                                            </Fieldset>
                                        </FormGroup>
                                    )}
                                    {contract438Attestation &&
                                        values.statutoryRegulatoryAttestation ===
                                            'NO' && (
                                            <div
                                                className={
                                                    styles.contractAttestation
                                                }
                                            >
                                                <FieldTextarea
                                                    label={
                                                        StatutoryRegulatoryAttestationDescription
                                                    }
                                                    id="statutoryRegulatoryAttestationDescription"
                                                    name="statutoryRegulatoryAttestationDescription"
                                                    aria-required
                                                    showError={Boolean(showFieldErrors(
                                                        'statutoryRegulatoryAttestationDescription',
                                                        errors
                                                    ))}
                                                    hint={
                                                        <ReactRouterLinkWithLogging
                                                            variant="external"
                                                            className={
                                                                'margin-bottom-1'
                                                            }
                                                            to={{
                                                                pathname:
                                                                    '/help',
                                                                hash: '#non-compliance-guidance',
                                                            }}
                                                            target="_blank"
                                                        >
                                                            Non-compliance
                                                            definitions and
                                                            examples
                                                        </ReactRouterLinkWithLogging>
                                                    }
                                                />
                                            </div>
                                        )}
                                    <FormGroup
                                        error={Boolean(showFieldErrors(
                                            'contractExecutionStatus',
                                            errors
                                        ))}
                                    >
                                        <Fieldset
                                            role="radiogroup"
                                            aria-required
                                            className={styles.radioGroup}
                                            legend="Contract status"
                                        >
                                            <span
                                                className={
                                                    styles.requiredOptionalText
                                                }
                                            >
                                                Required
                                            </span>
                                            {Boolean(showFieldErrors(
                                                'contractExecutionStatus',
                                                errors
                                            )) && (
                                                <PoliteErrorMessage formFieldLabel="Contract status">
                                                    {
                                                        errors.contractExecutionStatus
                                                    }
                                                </PoliteErrorMessage>
                                            )}
                                            <FieldRadio
                                                id="executedContract"
                                                name="contractExecutionStatus"
                                                label="Fully executed"
                                                aria-required
                                                value={'EXECUTED'}
                                                list_position={1}
                                                list_options={2}
                                                parent_component_heading="Contract status"
                                                radio_button_title="Fully executed"
                                            />
                                            <FieldRadio
                                                id="unexecutedContract"
                                                name="contractExecutionStatus"
                                                label="Unexecuted by some or all parties"
                                                aria-required
                                                value={'UNEXECUTED'}
                                                list_position={2}
                                                list_options={2}
                                                parent_component_heading="Contract status"
                                                radio_button_title="Unexecuted by some or all parties"
                                            />
                                        </Fieldset>
                                    </FormGroup>
                                    {
                                        <>
                                            <FormGroup
                                                error={
                                                    Boolean(showFieldErrors(
                                                        'contractDateStart',
                                                        errors
                                                    )) ||
                                                    Boolean(showFieldErrors(
                                                        'contractDateEnd',
                                                        errors
                                                    ))
                                                }
                                            >
                                                <Fieldset
                                                    aria-required
                                                    legend={
                                                        isContractAmendment(
                                                            draftSubmission
                                                        )
                                                            ? 'Amendment effective dates'
                                                            : 'Contract effective dates'
                                                    }
                                                >
                                                    <span
                                                        className={
                                                            styles.requiredOptionalText
                                                        }
                                                    >
                                                        Required
                                                    </span>
                                                    {Boolean(showFieldErrors(
                                                        'contractDateStart', errors) ||
                                                    Boolean(showFieldErrors('contractDateEnd', errors)
                                                    )) && (
                                                        <ContractDatesErrorMessage
                                                            values={values}
                                                            validationErrorMessage={
                                                                errors.contractDateStart ||
                                                                errors.contractDateEnd ||
                                                                'Invalid date'
                                                            }
                                                            formFieldLabel={
                                                                isContractAmendment(
                                                                    draftSubmission
                                                                )
                                                                    ? 'Amendment effective dates'
                                                                    : 'Contract effective dates'
                                                            }
                                                        />
                                                    )}
                                                    <LinkWithLogging
                                                        aria-label="Effective date guidance (opens in new window)"
                                                        href={
                                                            '/help#effective-date-guidance'
                                                        }
                                                        variant="external"
                                                        target="_blank"
                                                    >
                                                        Effective date guidance
                                                    </LinkWithLogging>
                                                    <DateRangePicker
                                                        className={
                                                            styles.dateRangePicker
                                                        }
                                                        startDateHint="mm/dd/yyyy"
                                                        startDateLabel="Start date"
                                                        startDatePickerProps={{
                                                            id: 'contractDateStart',
                                                            name: 'contractDateStart',
                                                            'aria-required':
                                                                true,
                                                            disabled: false,
                                                            defaultValue:
                                                                values.contractDateStart,
                                                            maxDate:
                                                                formattedDateMinusOneDay(
                                                                    values.contractDateEnd
                                                                ),
                                                            onChange: (val) =>
                                                                setFieldValue(
                                                                    'contractDateStart',
                                                                    formatUserInputDate(
                                                                        val
                                                                    )
                                                                ),
                                                        }}
                                                        endDateHint="mm/dd/yyyy"
                                                        endDateLabel="End date"
                                                        endDatePickerProps={{
                                                            disabled: false,
                                                            id: 'contractDateEnd',
                                                            name: 'contractDateEnd',
                                                            'aria-required':
                                                                true,
                                                            defaultValue:
                                                                values.contractDateEnd,
                                                            minDate:
                                                                formattedDatePlusOneDay(
                                                                    values.contractDateStart
                                                                ),
                                                            onChange: (val) =>
                                                                setFieldValue(
                                                                    'contractDateEnd',
                                                                    formatUserInputDate(
                                                                        val
                                                                    )
                                                                ),
                                                        }}
                                                    />
                                                </Fieldset>
                                            </FormGroup>
                                            <FormGroup
                                                error={Boolean(showFieldErrors(
                                                    'managedCareEntities',
                                                    errors
                                                ))}
                                            >
                                                <Fieldset
                                                    aria-required
                                                    legend="Managed Care entities"
                                                >
                                                    <span
                                                        className={
                                                            styles.requiredOptionalText
                                                        }
                                                    >
                                                        Required
                                                    </span>
                                                    <Link
                                                        variant="external"
                                                        href={
                                                            'https://www.medicaid.gov/medicaid/managed-care/managed-care-entities/index.html'
                                                        }
                                                        target="_blank"
                                                    >
                                                        Managed Care entity
                                                        definitions
                                                    </Link>
                                                    <div className="usa-hint">
                                                        <span>
                                                            Check all that apply
                                                        </span>
                                                    </div>
                                                    {Boolean(showFieldErrors(
                                                        'managedCareEntities',
                                                        errors
                                                    )) && (
                                                        <PoliteErrorMessage formFieldLabel="Managed Care entities">
                                                            {
                                                                errors.managedCareEntities
                                                            }
                                                        </PoliteErrorMessage>
                                                    )}
                                                    <FieldCheckbox
                                                        id="managedCareOrganization"
                                                        name="managedCareEntities"
                                                        label={
                                                            ManagedCareEntityRecord.MCO
                                                        }
                                                        value="MCO"
                                                        heading="Managed Care entities"
                                                        parent_component_heading={
                                                            formHeading
                                                        }
                                                    />
                                                    <FieldCheckbox
                                                        id="prepaidInpatientHealthPlan"
                                                        name="managedCareEntities"
                                                        label={
                                                            ManagedCareEntityRecord.PIHP
                                                        }
                                                        value="PIHP"
                                                        heading="Managed Care entities"
                                                        parent_component_heading={
                                                            formHeading
                                                        }
                                                    />
                                                    <FieldCheckbox
                                                        id="prepaidAmbulatoryHealthPlans"
                                                        name="managedCareEntities"
                                                        label={
                                                            ManagedCareEntityRecord.PAHP
                                                        }
                                                        value="PAHP"
                                                        heading="Managed Care entities"
                                                        parent_component_heading={
                                                            formHeading
                                                        }
                                                    />
                                                    <FieldCheckbox
                                                        id="primaryCareCaseManagementEntity"
                                                        name="managedCareEntities"
                                                        label={
                                                            ManagedCareEntityRecord.PCCM
                                                        }
                                                        value="PCCM"
                                                        heading="Managed Care entities"
                                                        parent_component_heading={
                                                            formHeading
                                                        }
                                                    />
                                                </Fieldset>
                                            </FormGroup>

                                            <FormGroup
                                                error={Boolean(showFieldErrors(
                                                    'federalAuthorities',
                                                    errors
                                                ))}
                                            >
                                                <Fieldset
                                                    aria-required
                                                    legend="Active federal operating authority"
                                                >
                                                    <span
                                                        className={
                                                            styles.requiredOptionalText
                                                        }
                                                    >
                                                        Required
                                                    </span>
                                                    <Link
                                                        variant="external"
                                                        href={
                                                            'https://www.medicaid.gov/medicaid/managed-care/managed-care-authorities/index.html'
                                                        }
                                                        target="_blank"
                                                    >
                                                        Managed Care authority
                                                        definitions
                                                    </Link>
                                                    <div className="usa-hint">
                                                        <span>
                                                            Check all that apply
                                                        </span>
                                                    </div>
                                                    {Boolean(showFieldErrors(
                                                        'federalAuthorities',
                                                        errors
                                                    )) && (
                                                        <PoliteErrorMessage formFieldLabel="Active federal operating authority">
                                                            {
                                                                errors.federalAuthorities
                                                            }
                                                        </PoliteErrorMessage>
                                                    )}
                                                    {applicableFederalAuthorities.map(
                                                        (federalAuthority) => (
                                                            <FieldCheckbox
                                                                id={federalAuthority.toLowerCase()}
                                                                key={federalAuthority.toLowerCase()}
                                                                name="federalAuthorities"
                                                                label={
                                                                    FederalAuthorityRecord[
                                                                        federalAuthority
                                                                    ]
                                                                }
                                                                value={
                                                                    federalAuthority
                                                                }
                                                                heading="Managed Care entities"
                                                                parent_component_heading={
                                                                    formHeading
                                                                }
                                                            />
                                                        )
                                                    )}
                                                </Fieldset>
                                            </FormGroup>
                                            {isContractWithProvisions(
                                                draftSubmission
                                            ) && (
                                                <FormGroup data-testid="yes-no-group">
                                                    <Fieldset
                                                        aria-required
                                                        legend={
                                                            isBaseContract(
                                                                draftSubmission
                                                            )
                                                                ? 'Does this contract action include provisions related to any of the following'
                                                                : 'Does this contract action include new or modified provisions related to any of the following'
                                                        }
                                                    >
                                                        <span
                                                            className={
                                                                styles.requiredOptionalText
                                                            }
                                                        >
                                                            Required
                                                        </span>
                                                        {applicableProvisions.map(
                                                            (
                                                                modifiedProvisionName
                                                            ) => (
                                                                <FieldYesNo
                                                                    id={
                                                                        modifiedProvisionName
                                                                    }
                                                                    key={
                                                                        modifiedProvisionName
                                                                    }
                                                                    name={
                                                                        modifiedProvisionName
                                                                    }
                                                                    label={generateProvisionLabel(
                                                                        draftSubmission,
                                                                        modifiedProvisionName
                                                                    )}
                                                                    showError={Boolean(showFieldErrors(
                                                                        modifiedProvisionName,
                                                                        errors
                                                                    ))}
                                                                    variant="SUBHEAD"
                                                                />
                                                            )
                                                        )}
                                                    </Fieldset>
                                                </FormGroup>
                                            )}
                                        </>
                                    }
                                </fieldset>

                                <PageActions
                                    saveAsDraftOnClick={async () => {
                                        await handleFormSubmit(
                                            values,
                                            setSubmitting,
                                            {
                                                shouldValidateDocuments:
                                                    true,
                                                redirectPath:
                                                    RoutesRecord.DASHBOARD_SUBMISSIONS,
                                            }
                                        )
                                    }}
                                    backOnClick={async () => {
                                        // do not need to validate or resubmit if no documents are uploaded
                                        if (false) {
                                            navigate('../type')
                                        } else {
                                            await handleFormSubmit(
                                                values,
                                                setSubmitting,
                                                {
                                                    shouldValidateDocuments:
                                                        false,
                                                    redirectPath: '../type',
                                                }
                                            )
                                        }
                                    }}
                                    disableContinue={
                                        shouldValidate &&
                                        !!Object.keys(errors).length
                                    }
                                    actionInProgress={isSubmitting}
                                    backOnClickUrl={generatePath(
                                        RoutesRecord.SUBMISSIONS_TYPE,
                                        { id }
                                    )}
                                    saveAsDraftOnClickUrl={
                                        RoutesRecord.DASHBOARD_SUBMISSIONS
                                    }
                                    continueOnClickUrl={
                                        draftSubmission.draftRevision?.formData.submissionType ===
                                        'CONTRACT_ONLY'
                                            ? '/edit/contacts'
                                            : '/edit/rate-details'
                                    }
                                />
                            </UswdsForm>
                        </>
                    )}
                </Formik>
            </FormContainer>
        </>
    )
}
