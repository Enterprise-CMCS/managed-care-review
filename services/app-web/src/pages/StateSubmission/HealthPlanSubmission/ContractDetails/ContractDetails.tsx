import React, { useState, useEffect } from 'react'
import {
    Form as UswdsForm,
    FormGroup,
    Fieldset,
    Link,
} from '@trussworks/react-uswds'
import { v4 as uuidv4 } from 'uuid'
import { generatePath, useNavigate } from 'react-router-dom'
import { Formik, FormikErrors, getIn } from 'formik'
import styles from '../../StateSubmissionForm.module.scss'
import { CustomDateRangePicker } from '../../../../components/Form/CustomDateRangePicker/CustomDateRangePicker'

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
    FormNotificationContainer,
    FormContainer,
    PageActions,
} from '../../../../components'
import { formatForForm } from '../../../../formHelpers'
import { formatUserInputDate } from '@mc-review/dates'
import { useS3 } from '../../../../contexts/S3Context'

import { ContractDetailsFormSchema } from './ContractDetailsSchema'
import {
    activeFormPages,
    formattedDatePlusOneDay,
    formattedDateMinusOneDay,
    type ContractFormPageProps,
} from '../../submissionUtils'
import {
    formatDocumentsForGQL,
    formatDocumentsForForm,
    formatFormDateForGQL,
} from '../../../../formHelpers/formatters'
import { ACCEPTED_SUBMISSION_FILE_TYPES } from '../../../../components/FileUpload'
import {
    federalAuthorityKeysForCHIP,
    federalAuthorityKeys,
    ManagedCareEntityRecord,
    FederalAuthorityRecord,
    dsnpTriggers,
    isBaseContract,
    isCHIPOnly,
    isContractAmendment,
    isContractWithProvisions,
    generateProvisionLabel,
    generateApplicableProvisionsList,
} from '@mc-review/submissions'
import { featureFlags } from '@mc-review/common-code'
import {
    RoutesRecord,
    RouteT,
    StatutoryRegulatoryAttestation,
    StatutoryRegulatoryAttestationDescription,
    StatutoryRegulatoryAttestationQuestion,
} from '@mc-review/constants'
import { useLDClient } from 'launchdarkly-react-client-sdk'
import {
    booleanAsYesNoFormValue,
    yesNoFormValueAsBoolean,
} from '../../../../components/Form/FieldYesNo'
import { useCurrentRoute, useRouteParams } from '../../../../hooks'
import { useAuth } from '../../../../contexts/AuthContext'
import {
    PageBannerAlerts,
    ErrorOrLoadingPage,
} from '../../SharedSubmissionComponents'
import { useErrorSummary } from '../../../../hooks/useErrorSummary'
import { useContractForm } from '../../../../hooks/useContractForm'
import {
    UpdateContractDraftRevisionInput,
    ContractDraftRevisionFormDataInput,
    ManagedCareEntity,
    ContractExecutionStatus,
    FederalAuthority,
} from '../../../../gen/gqlClient'
import { useFocusOnRender } from '../../../../hooks/useFocusOnRender'
import { usePage } from '../../../../contexts/PageContext'

export type ContractDetailsFormValues = {
    contractDocuments: FileItemT[]
    supportingDocuments: FileItemT[]
    contractExecutionStatus: ContractExecutionStatus | undefined
    contractDateStart: string
    contractDateEnd: string
    managedCareEntities: ManagedCareEntity[]
    federalAuthorities: FederalAuthority[]
    dsnpContract: string | undefined
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
}: ContractFormPageProps): React.ReactElement => {
    const [shouldValidate, setShouldValidate] = useState(showValidations)
    const [draftSaved, setDraftSaved] = useState(false)
    useFocusOnRender(draftSaved, '[data-testid="saveAsDraftSuccessBanner"]')
    const navigate = useNavigate()
    const ldClient = useLDClient()
    const { setFocusErrorSummaryHeading, errorSummaryHeadingRef } =
        useErrorSummary()

    const { loggedInUser } = useAuth()
    const { currentRoute } = useCurrentRoute()
    const { id, contractSubmissionType } = useRouteParams()
    const { updateActiveMainContent } = usePage()
    const { draftSubmission, interimState, updateDraft, showPageErrorMessage } =
        useContractForm(id)

    const activeMainContentId = 'contractDetailsPageMainContent'

    // Set the active main content to focus when click the Skip to main content button.
    useEffect(() => {
        updateActiveMainContent(activeMainContentId)
    }, [activeMainContentId, updateActiveMainContent])

    const contract438Attestation = ldClient?.variation(
        featureFlags.CONTRACT_438_ATTESTATION.flag,
        featureFlags.CONTRACT_438_ATTESTATION.defaultValue
    )

    const hideSupportingDocs = ldClient?.variation(
        featureFlags.HIDE_SUPPORTING_DOCS_PAGE.flag,
        featureFlags.HIDE_SUPPORTING_DOCS_PAGE.defaultValue
    )

    const enableDSNPs = ldClient?.variation(
        featureFlags.DSNP.flag,
        featureFlags.DSNP.defaultValue
    )

    // Contract documents state management
    const { getKey, handleUploadFile, handleScanFile } = useS3()
    if (interimState || !draftSubmission)
        return <ErrorOrLoadingPage state={interimState || 'GENERIC_ERROR'} />

    const fileItemsFromDraftSubmission = (
        docType: string
    ): FileItemT[] | undefined => {
        if (
            (draftSubmission &&
                docType === 'contract' &&
                !draftSubmission.draftRevision.formData.contractDocuments) ||
            (draftSubmission &&
                docType === 'supporting' &&
                !draftSubmission.draftRevision.formData.supportingDocuments)
        )
            return undefined
        const docs =
            docType === 'contract'
                ? draftSubmission.draftRevision.formData.contractDocuments
                : draftSubmission.draftRevision.formData.supportingDocuments
        return docs.map((doc) => {
            const key = getKey(doc.s3URL)
            if (!key) {
                return {
                    id: uuidv4(),
                    name: doc.name,
                    key: 'INVALID_KEY',
                    s3URL: undefined,
                    status: 'UPLOAD_ERROR',
                    sha256: doc.sha256,
                }
            }
            return {
                id: uuidv4(),
                name: doc.name,
                key: key,
                s3URL: doc.s3URL,
                status: 'UPLOAD_COMPLETE',
                sha256: doc.sha256,
            }
        })
    }
    const applicableProvisions =
        generateApplicableProvisionsList(draftSubmission)

    const applicableFederalAuthorities = isCHIPOnly(draftSubmission)
        ? federalAuthorityKeysForCHIP
        : federalAuthorityKeys

    const contractDetailsInitialValues: ContractDetailsFormValues = {
        contractDocuments: formatDocumentsForForm({
            documents: draftSubmission.draftRevision.formData.contractDocuments,
            getKey: getKey,
        }),
        supportingDocuments: formatDocumentsForForm({
            documents:
                draftSubmission.draftRevision.formData.supportingDocuments,
            getKey: getKey,
        }),
        contractExecutionStatus:
            draftSubmission.draftRevision.formData.contractExecutionStatus ??
            undefined,
        contractDateStart:
            (draftSubmission &&
                formatForForm(
                    draftSubmission.draftRevision.formData.contractDateStart
                )) ??
            '',
        contractDateEnd:
            (draftSubmission &&
                formatForForm(
                    draftSubmission.draftRevision.formData.contractDateEnd
                )) ??
            '',
        managedCareEntities:
            (draftSubmission.draftRevision.formData
                .managedCareEntities as ManagedCareEntity[]) ?? [],
        federalAuthorities:
            draftSubmission.draftRevision.formData.federalAuthorities ?? [],
        dsnpContract:
            booleanAsYesNoFormValue(
                draftSubmission.draftRevision.formData.dsnpContract
            ) ?? '',
        inLieuServicesAndSettings:
            booleanAsYesNoFormValue(
                draftSubmission.draftRevision.formData.inLieuServicesAndSettings
            ) ?? '',
        modifiedBenefitsProvided:
            booleanAsYesNoFormValue(
                draftSubmission.draftRevision.formData.modifiedBenefitsProvided
            ) ?? '',
        modifiedGeoAreaServed:
            booleanAsYesNoFormValue(
                draftSubmission.draftRevision.formData.modifiedGeoAreaServed
            ) ?? '',
        modifiedMedicaidBeneficiaries:
            booleanAsYesNoFormValue(
                draftSubmission.draftRevision.formData
                    .modifiedMedicaidBeneficiaries
            ) ?? '',
        modifiedRiskSharingStrategy:
            booleanAsYesNoFormValue(
                draftSubmission.draftRevision.formData
                    .modifiedRiskSharingStrategy
            ) ?? '',
        modifiedIncentiveArrangements:
            booleanAsYesNoFormValue(
                draftSubmission.draftRevision.formData
                    .modifiedIncentiveArrangements
            ) ?? '',
        modifiedWitholdAgreements:
            booleanAsYesNoFormValue(
                draftSubmission.draftRevision.formData.modifiedWitholdAgreements
            ) ?? '',
        modifiedStateDirectedPayments:
            booleanAsYesNoFormValue(
                draftSubmission.draftRevision.formData
                    .modifiedStateDirectedPayments
            ) ?? '',
        modifiedPassThroughPayments:
            booleanAsYesNoFormValue(
                draftSubmission.draftRevision.formData
                    .modifiedPassThroughPayments
            ) ?? '',
        modifiedPaymentsForMentalDiseaseInstitutions:
            booleanAsYesNoFormValue(
                draftSubmission.draftRevision.formData
                    .modifiedPaymentsForMentalDiseaseInstitutions
            ) ?? '',
        modifiedMedicalLossRatioStandards:
            booleanAsYesNoFormValue(
                draftSubmission.draftRevision.formData
                    .modifiedMedicalLossRatioStandards
            ) ?? '',
        modifiedOtherFinancialPaymentIncentive:
            booleanAsYesNoFormValue(
                draftSubmission.draftRevision.formData
                    .modifiedOtherFinancialPaymentIncentive
            ) ?? '',
        modifiedEnrollmentProcess:
            booleanAsYesNoFormValue(
                draftSubmission.draftRevision.formData.modifiedEnrollmentProcess
            ) ?? '',
        modifiedGrevienceAndAppeal:
            booleanAsYesNoFormValue(
                draftSubmission.draftRevision.formData
                    .modifiedGrevienceAndAppeal
            ) ?? '',
        modifiedNetworkAdequacyStandards:
            booleanAsYesNoFormValue(
                draftSubmission.draftRevision.formData
                    .modifiedNetworkAdequacyStandards
            ) ?? '',
        modifiedLengthOfContract:
            booleanAsYesNoFormValue(
                draftSubmission.draftRevision.formData.modifiedLengthOfContract
            ) ?? '',
        modifiedNonRiskPaymentArrangements:
            booleanAsYesNoFormValue(
                draftSubmission.draftRevision.formData
                    .modifiedNonRiskPaymentArrangements
            ) ?? '',
        statutoryRegulatoryAttestation:
            booleanAsYesNoFormValue(
                draftSubmission.draftRevision.formData
                    .statutoryRegulatoryAttestation
            ) ?? '',
        statutoryRegulatoryAttestationDescription:
            draftSubmission.draftRevision.formData
                .statutoryRegulatoryAttestationDescription ?? '',
    }

    const showFieldErrors = (
        fieldName: keyof ContractDetailsFormValues,
        errors: FormikErrors<ContractDetailsFormValues>
    ): string | undefined => {
        if (!shouldValidate) return undefined
        return getIn(errors, `${fieldName}`)
    }

    const genecontractErrorsummaryErrors = (
        errors: FormikErrors<ContractDetailsFormValues>,
        values: ContractDetailsFormValues
    ) => {
        const errorsObject: { [field: string]: string } = {}
        Object.entries(errors).forEach(([field, value]) => {
            if (typeof value === 'string') {
                errorsObject[field] = value
            }
            if (Array.isArray(value) && Array.length > 0) {
                Object.entries(value).forEach(
                    ([arrItemField, arrItemValue]) => {
                        if (typeof arrItemValue === 'string') {
                            errorsObject[arrItemField] = arrItemValue
                        }
                    }
                )
            }
        })
        values.contractDocuments.forEach((item) => {
            const key = 'contractDocuments'
            if (item.status === 'DUPLICATE_NAME_ERROR') {
                errorsObject[key] =
                    'You must remove all documents with error messages before continuing'
            } else if (item.status === 'SCANNING_ERROR') {
                errorsObject[key] =
                    'You must remove files that failed the security scan'
            } else if (item.status === 'UPLOAD_ERROR') {
                errorsObject[key] =
                    'You must remove or retry files that failed to upload'
            }
        })
        // return errors
        return errorsObject
    }

    const handleFormSubmit = async (
        values: ContractDetailsFormValues,
        setSubmitting: (isSubmitting: boolean) => void, // formik setSubmitting
        options: {
            type: 'SAVE_AS_DRAFT' | 'BACK' | 'CONTINUE'
            redirectPath?: RouteT
        }
    ) => {
        if (options.type === 'SAVE_AS_DRAFT' && draftSaved) {
            setDraftSaved(false)
        }

        const dsnpTrigger = values.federalAuthorities.some((type) =>
            dsnpTriggers.includes(type)
        )

        const updatedDraftSubmissionFormData: ContractDraftRevisionFormDataInput =
            {
                contractExecutionStatus: values.contractExecutionStatus,
                contractDateStart: formatFormDateForGQL(
                    values.contractDateStart
                ),
                contractDateEnd: formatFormDateForGQL(values.contractDateEnd),
                riskBasedContract:
                    draftSubmission.draftRevision.formData.riskBasedContract,
                populationCovered:
                    draftSubmission.draftRevision.formData.populationCovered,
                programIDs:
                    draftSubmission.draftRevision.formData.programIDs || [],
                stateContacts:
                    draftSubmission.draftRevision.formData.stateContacts || [],
                contractDocuments:
                    formatDocumentsForGQL(values.contractDocuments) || [],
                supportingDocuments:
                    formatDocumentsForGQL(values.supportingDocuments) || [],
                managedCareEntities: values.managedCareEntities,
                federalAuthorities: values.federalAuthorities,
                // Clear dsnpContract if all dsnp trigger federalAuthorities are removed after a value was previously selected for dsnpContract
                dsnpContract:
                    values.dsnpContract && dsnpTrigger
                        ? yesNoFormValueAsBoolean(values.dsnpContract)
                        : undefined,
                submissionType:
                    draftSubmission.draftRevision.formData.submissionType,
                statutoryRegulatoryAttestation: yesNoFormValueAsBoolean(
                    values.statutoryRegulatoryAttestation
                ),
                // If contract is in compliance, we set the description to undefined. This clears out previous non-compliance description
                statutoryRegulatoryAttestationDescription:
                    values.statutoryRegulatoryAttestationDescription,
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
            updatedDraftSubmissionFormData.inLieuServicesAndSettings =
                yesNoFormValueAsBoolean(values.inLieuServicesAndSettings)
            updatedDraftSubmissionFormData.modifiedBenefitsProvided =
                yesNoFormValueAsBoolean(values.modifiedBenefitsProvided)
            updatedDraftSubmissionFormData.modifiedGeoAreaServed =
                yesNoFormValueAsBoolean(values.modifiedGeoAreaServed)
            updatedDraftSubmissionFormData.modifiedMedicaidBeneficiaries =
                yesNoFormValueAsBoolean(values.modifiedMedicaidBeneficiaries)
            updatedDraftSubmissionFormData.modifiedRiskSharingStrategy =
                yesNoFormValueAsBoolean(values.modifiedRiskSharingStrategy)
            updatedDraftSubmissionFormData.modifiedIncentiveArrangements =
                yesNoFormValueAsBoolean(values.modifiedIncentiveArrangements)
            updatedDraftSubmissionFormData.modifiedWitholdAgreements =
                yesNoFormValueAsBoolean(values.modifiedWitholdAgreements)
            updatedDraftSubmissionFormData.modifiedStateDirectedPayments =
                yesNoFormValueAsBoolean(values.modifiedStateDirectedPayments)
            updatedDraftSubmissionFormData.modifiedPassThroughPayments =
                yesNoFormValueAsBoolean(values.modifiedPassThroughPayments)
            updatedDraftSubmissionFormData.modifiedPaymentsForMentalDiseaseInstitutions =
                yesNoFormValueAsBoolean(
                    values.modifiedPaymentsForMentalDiseaseInstitutions
                )
            updatedDraftSubmissionFormData.modifiedMedicalLossRatioStandards =
                yesNoFormValueAsBoolean(
                    values.modifiedMedicalLossRatioStandards
                )
            updatedDraftSubmissionFormData.modifiedOtherFinancialPaymentIncentive =
                yesNoFormValueAsBoolean(
                    values.modifiedOtherFinancialPaymentIncentive
                )
            updatedDraftSubmissionFormData.modifiedEnrollmentProcess =
                yesNoFormValueAsBoolean(values.modifiedEnrollmentProcess)
            updatedDraftSubmissionFormData.modifiedGrevienceAndAppeal =
                yesNoFormValueAsBoolean(values.modifiedGrevienceAndAppeal)
            updatedDraftSubmissionFormData.modifiedNetworkAdequacyStandards =
                yesNoFormValueAsBoolean(values.modifiedNetworkAdequacyStandards)
            updatedDraftSubmissionFormData.modifiedLengthOfContract =
                yesNoFormValueAsBoolean(values.modifiedLengthOfContract)
            updatedDraftSubmissionFormData.modifiedNonRiskPaymentArrangements =
                yesNoFormValueAsBoolean(
                    values.modifiedNonRiskPaymentArrangements
                )
        } else {
            updatedDraftSubmissionFormData.inLieuServicesAndSettings = undefined
            updatedDraftSubmissionFormData.modifiedBenefitsProvided = undefined
            updatedDraftSubmissionFormData.modifiedGeoAreaServed = undefined
            updatedDraftSubmissionFormData.modifiedMedicaidBeneficiaries =
                undefined
            updatedDraftSubmissionFormData.modifiedRiskSharingStrategy =
                undefined
            updatedDraftSubmissionFormData.modifiedIncentiveArrangements =
                undefined
            updatedDraftSubmissionFormData.modifiedWitholdAgreements = undefined
            updatedDraftSubmissionFormData.modifiedStateDirectedPayments =
                undefined
            updatedDraftSubmissionFormData.modifiedPassThroughPayments =
                undefined
            updatedDraftSubmissionFormData.modifiedPaymentsForMentalDiseaseInstitutions =
                undefined
            updatedDraftSubmissionFormData.modifiedMedicalLossRatioStandards =
                undefined
            updatedDraftSubmissionFormData.modifiedOtherFinancialPaymentIncentive =
                undefined
            updatedDraftSubmissionFormData.modifiedEnrollmentProcess = undefined
            updatedDraftSubmissionFormData.modifiedGrevienceAndAppeal =
                undefined
            updatedDraftSubmissionFormData.modifiedNetworkAdequacyStandards =
                undefined
            updatedDraftSubmissionFormData.modifiedLengthOfContract = undefined
            updatedDraftSubmissionFormData.modifiedNonRiskPaymentArrangements =
                undefined
        }

        const updatedContract: UpdateContractDraftRevisionInput = {
            formData: updatedDraftSubmissionFormData,
            contractID: draftSubmission.id,
            lastSeenUpdatedAt: draftSubmission.draftRevision.updatedAt,
        }

        const updatedSubmission = await updateDraft(updatedContract)
        if (updatedSubmission instanceof Error) {
            setSubmitting(false)
            console.info('Error updating draft submission: ', updatedSubmission)
        } else if (options.type === 'SAVE_AS_DRAFT' && updatedSubmission) {
            setDraftSaved(true)
            setSubmitting(false)
        } else {
            //Can assume back or continue was clicked at this point
            if (options.redirectPath) {
                navigate(
                    generatePath(RoutesRecord[options.redirectPath], {
                        id,
                        contractSubmissionType,
                    })
                )
            }
        }
    }

    const formHeading = 'Contract Details Form'

    return (
        <div id={activeMainContentId}>
            <FormNotificationContainer>
                <DynamicStepIndicator
                    formPages={activeFormPages(
                        draftSubmission.draftRevision.formData,
                        hideSupportingDocs
                    )}
                    currentFormPage={currentRoute}
                />
                <PageBannerAlerts
                    loggedInUser={loggedInUser}
                    unlockedInfo={draftSubmission.draftRevision.unlockInfo}
                    showPageErrorMessage={showPageErrorMessage ?? false}
                    draftSaved={draftSaved}
                />
            </FormNotificationContainer>
            <FormContainer id="ContactDetails">
                <Formik
                    initialValues={contractDetailsInitialValues}
                    onSubmit={(values, { setSubmitting }) => {
                        return handleFormSubmit(values, setSubmitting, {
                            type: 'CONTINUE',
                            redirectPath:
                                draftSubmission.draftRevision.formData
                                    .submissionType === 'CONTRACT_ONLY'
                                    ? 'SUBMISSIONS_CONTACTS'
                                    : 'SUBMISSIONS_RATE_DETAILS',
                        })
                    }}
                    validationSchema={() =>
                        ContractDetailsFormSchema(
                            draftSubmission,
                            ldClient?.allFlags()
                        )
                    }
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
                                onSubmit={(e) => {
                                    setShouldValidate(true)
                                    setFocusErrorSummaryHeading(true)
                                    handleSubmit(e)
                                }}
                                noValidate
                            >
                                <fieldset className="usa-fieldset">
                                    <legend className="srOnly">
                                        Contract Details
                                    </legend>

                                    {shouldValidate && (
                                        <ErrorSummary
                                            errors={genecontractErrorsummaryErrors(
                                                errors,
                                                values
                                            )}
                                            headingRef={errorSummaryHeadingRef}
                                        />
                                    )}

                                    <FormGroup
                                        error={Boolean(
                                            showFieldErrors(
                                                'contractDocuments',
                                                errors
                                            )
                                        )}
                                        className="margin-top-0"
                                    >
                                        <FileUpload
                                            id="contractDocuments"
                                            name="contractDocuments"
                                            label="Upload contract"
                                            aria-required
                                            error={showFieldErrors(
                                                'contractDocuments',
                                                errors
                                            )}
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
                                                    <span className="mcr-note padding-top-05">
                                                        Supporting documents can
                                                        be added later. If you
                                                        have additional contract
                                                        actions, you must submit
                                                        them in a separate
                                                        submission.
                                                    </span>
                                                    <span className="usa-hint padding-top-1">
                                                        This input only accepts
                                                        PDF, CSV, DOC, DOCX,
                                                        XLS, XLSX files.
                                                    </span>
                                                </span>
                                            }
                                            accept={
                                                ACCEPTED_SUBMISSION_FILE_TYPES
                                            }
                                            initialItems={fileItemsFromDraftSubmission(
                                                'contract'
                                            )}
                                            uploadFile={(file) =>
                                                handleUploadFile(
                                                    file,
                                                    'HEALTH_PLAN_DOCS'
                                                )
                                            }
                                            scanFile={(key) =>
                                                handleScanFile(
                                                    key,
                                                    'HEALTH_PLAN_DOCS'
                                                )
                                            }
                                            onFileItemsUpdate={({
                                                fileItems,
                                            }) =>
                                                setFieldValue(
                                                    `contractDocuments`,
                                                    fileItems
                                                )
                                            }
                                        />
                                    </FormGroup>
                                    {hideSupportingDocs && (
                                        <FormGroup
                                            error={Boolean(
                                                showFieldErrors(
                                                    'supportingDocuments',
                                                    errors
                                                )
                                            )}
                                        >
                                            <FileUpload
                                                id="supportingDocuments"
                                                name="supportingDocuments"
                                                label="Upload contract-supporting documents"
                                                error={showFieldErrors(
                                                    'supportingDocuments',
                                                    errors
                                                )}
                                                hint={
                                                    <span
                                                        className={
                                                            styles.guidanceTextBlock
                                                        }
                                                    >
                                                        <LinkWithLogging
                                                            aria-label="Document definitions and requirements (opens in new window)"
                                                            href={
                                                                '/help#supporting-documents'
                                                            }
                                                            variant="external"
                                                            target="_blank"
                                                        >
                                                            Document definitions
                                                            and requirements
                                                        </LinkWithLogging>
                                                        <span className="mcr-note padding-top-05">
                                                            Upload any
                                                            supporting documents
                                                            related to the
                                                            contract.
                                                        </span>
                                                        <span className="usa-hint padding-top-1">
                                                            This input only
                                                            accepts PDF, CSV,
                                                            DOC, DOCX, XLS, XLSX
                                                            files.
                                                        </span>
                                                    </span>
                                                }
                                                accept={
                                                    ACCEPTED_SUBMISSION_FILE_TYPES
                                                }
                                                initialItems={fileItemsFromDraftSubmission(
                                                    'supporting'
                                                )}
                                                uploadFile={(file) =>
                                                    handleUploadFile(
                                                        file,
                                                        'HEALTH_PLAN_DOCS'
                                                    )
                                                }
                                                scanFile={(key) =>
                                                    handleScanFile(
                                                        key,
                                                        'HEALTH_PLAN_DOCS'
                                                    )
                                                }
                                                onFileItemsUpdate={({
                                                    fileItems,
                                                }) =>
                                                    setFieldValue(
                                                        `supportingDocuments`,
                                                        fileItems
                                                    )
                                                }
                                            />
                                        </FormGroup>
                                    )}
                                    {contract438Attestation && (
                                        <FormGroup
                                            error={Boolean(
                                                showFieldErrors(
                                                    'statutoryRegulatoryAttestation',
                                                    errors
                                                )
                                            )}
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
                                                {Boolean(
                                                    showFieldErrors(
                                                        'statutoryRegulatoryAttestation',
                                                        errors
                                                    )
                                                ) && (
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
                                                    showError={Boolean(
                                                        showFieldErrors(
                                                            'statutoryRegulatoryAttestationDescription',
                                                            errors
                                                        )
                                                    )}
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
                                        error={Boolean(
                                            showFieldErrors(
                                                'contractExecutionStatus',
                                                errors
                                            )
                                        )}
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
                                            {Boolean(
                                                showFieldErrors(
                                                    'contractExecutionStatus',
                                                    errors
                                                )
                                            ) && (
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
                                                    Boolean(
                                                        showFieldErrors(
                                                            'contractDateStart',
                                                            errors
                                                        )
                                                    ) ||
                                                    Boolean(
                                                        showFieldErrors(
                                                            'contractDateEnd',
                                                            errors
                                                        )
                                                    )
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
                                                    <CustomDateRangePicker
                                                        className={
                                                            styles.dateRangePicker
                                                        }
                                                        startDateHint="mm/dd/yyyy"
                                                        startDateLabel="Start date"
                                                        startDateError={showFieldErrors(
                                                            'contractDateStart',
                                                            errors
                                                        )}
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
                                                        endDateError={showFieldErrors(
                                                            'contractDateEnd',
                                                            errors
                                                        )}
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
                                                error={Boolean(
                                                    showFieldErrors(
                                                        'managedCareEntities',
                                                        errors
                                                    )
                                                )}
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
                                                    {Boolean(
                                                        showFieldErrors(
                                                            'managedCareEntities',
                                                            errors
                                                        )
                                                    ) && (
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
                                                error={Boolean(
                                                    showFieldErrors(
                                                        'federalAuthorities',
                                                        errors
                                                    )
                                                )}
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
                                                    {Boolean(
                                                        showFieldErrors(
                                                            'federalAuthorities',
                                                            errors
                                                        )
                                                    ) && (
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
                                            {enableDSNPs &&
                                                values.federalAuthorities.some(
                                                    (type) =>
                                                        dsnpTriggers.includes(
                                                            type
                                                        )
                                                ) && (
                                                    <FormGroup
                                                        error={Boolean(
                                                            showFieldErrors(
                                                                'dsnpContract',
                                                                errors
                                                            )
                                                        )}
                                                    >
                                                        <Fieldset
                                                            aria-required
                                                            id="dsnpContract"
                                                            legend="Is this contract associated with a Dual-Eligible Special Needs Plan (D-SNP) that covers Medicaid benefits?"
                                                        >
                                                            <span
                                                                className={
                                                                    styles.requiredOptionalText
                                                                }
                                                            >
                                                                Required
                                                            </span>
                                                            <div
                                                                role="note"
                                                                aria-labelledby="dsnpContract"
                                                                className="mcr-note margin-top-1"
                                                            >
                                                                See 42 CFR §
                                                                422.2
                                                            </div>
                                                            <LinkWithLogging
                                                                variant="external"
                                                                href={
                                                                    '/help#dual-eligible-special-needs-plans'
                                                                }
                                                                target="_blank"
                                                                data-testid="dsnpGuidanceLink"
                                                                aria-label="D-SNP guidance (opens in new window)"
                                                            >
                                                                D-SNP guidance
                                                            </LinkWithLogging>
                                                            <FieldYesNo
                                                                id="dsnpContract"
                                                                name="dsnpContract"
                                                                label="Is this contract associated with a Dual-Eligible Special Needs Plan (D-SNP) that covers Medicaid benefits?"
                                                                showError={Boolean(
                                                                    showFieldErrors(
                                                                        'dsnpContract',
                                                                        errors
                                                                    )
                                                                )}
                                                                legendStyle="srOnly"
                                                            />
                                                        </Fieldset>
                                                    </FormGroup>
                                                )}
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
                                                                    showError={Boolean(
                                                                        showFieldErrors(
                                                                            modifiedProvisionName,
                                                                            errors
                                                                        )
                                                                    )}
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
                                                type: 'SAVE_AS_DRAFT',
                                            }
                                        )
                                    }}
                                    backOnClick={async () => {
                                        // do not need to validate or resubmit if no documents are uploaded
                                        if (
                                            values.contractDocuments.length ===
                                            0
                                        ) {
                                            navigate('../type')
                                        } else {
                                            await handleFormSubmit(
                                                values,
                                                setSubmitting,
                                                {
                                                    type: 'BACK',
                                                    redirectPath:
                                                        'SUBMISSIONS_TYPE',
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
                                        {
                                            id,
                                            contractSubmissionType,
                                        }
                                    )}
                                    continueOnClickUrl={
                                        draftSubmission.draftRevision.formData
                                            .submissionType === 'CONTRACT_ONLY'
                                            ? generatePath(
                                                  RoutesRecord.SUBMISSIONS_RATE_DETAILS,
                                                  {
                                                      id,
                                                      contractSubmissionType,
                                                  }
                                              )
                                            : generatePath(
                                                  RoutesRecord.SUBMISSIONS_CONTACTS,
                                                  {
                                                      id,
                                                      contractSubmissionType,
                                                  }
                                              )
                                    }
                                />
                            </UswdsForm>
                        </>
                    )}
                </Formik>
            </FormContainer>
        </div>
    )
}
