import React, { useEffect, useState } from 'react'
import dayjs from 'dayjs'
import {
    Form as UswdsForm,
    FormGroup,
    Fieldset,
    Link,
    DateRangePicker,
} from '@trussworks/react-uswds'
import { v4 as uuidv4 } from 'uuid'
import { Link as ReactRouterLink, useNavigate } from 'react-router-dom'
import { Formik, FormikErrors } from 'formik'

import styles from '../StateSubmissionForm.module.scss'

import {
    FileUpload,
    S3FileData,
    FileItemT,
    FieldRadio,
    FieldCheckbox,
    ErrorSummary,
    PoliteErrorMessage,
    FieldYesNo,
    FieldTextarea,
    DynamicStepIndicator,
} from '../../../components'
import {
    formatForForm,
    formatFormDateForDomain,
    formatUserInputDate,
    isDateRangeEmpty,
} from '../../../formHelpers'
import { useS3 } from '../../../contexts/S3Context'
import { isS3Error } from '../../../s3'

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
import { formatYesNoForProto } from '../../../formHelpers/formatters'
import { ACCEPTED_SUBMISSION_FILE_TYPES } from '../../../components/FileUpload'
import {
    federalAuthorityKeysForCHIP,
    federalAuthorityKeys,
} from '../../../common-code/healthPlanFormDataType'
import {
    generateProvisionLabel,
    generateApplicableProvisionsList,
} from '../../../common-code/healthPlanSubmissionHelpers/provisions'
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
} from '../../../common-code/healthPlanFormDataType/healthPlanFormData'
import { RoutesRecord } from '../../../constants'
import { useLDClient } from 'launchdarkly-react-client-sdk'
import { featureFlags } from '../../../common-code/featureFlags'
import {
    StatutoryRegulatoryAttestation,
    StatutoryRegulatoryAttestationDescription,
    StatutoryRegulatoryAttestationQuestion,
} from '../../../constants/statutoryRegulatoryAttestation'
import { FormContainer } from '../FormContainer'
import {
    useCurrentRoute,
    useHealthPlanPackageForm,
    useRouteParams,
} from '../../../hooks'
import { useAuth } from '../../../contexts/AuthContext'
import { ErrorOrLoadingPage } from '../ErrorOrLoadingPage'
import { PageBannerAlerts } from '../PageBannerAlerts'

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
}: {
    values: ContractDetailsFormValues
    validationErrorMessage: string
}): React.ReactElement => (
    <PoliteErrorMessage>
        {isDateRangeEmpty(values.contractDateStart, values.contractDateEnd)
            ? 'You must provide a start and an end date'
            : validationErrorMessage}
    </PoliteErrorMessage>
)
export interface ContractDetailsFormValues {
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
type FormError =
    FormikErrors<ContractDetailsFormValues>[keyof FormikErrors<ContractDetailsFormValues>]

export const ContractDetails = ({
    showValidations = false,
}: HealthPlanFormPageProps): React.ReactElement => {
    const [shouldValidate, setShouldValidate] = React.useState(showValidations)
    const navigate = useNavigate()
    const ldClient = useLDClient()

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
        unlockInfo,
    } = useHealthPlanPackageForm(id)

    const contract438Attestation = ldClient?.variation(
        featureFlags.CONTRACT_438_ATTESTATION.flag,
        featureFlags.CONTRACT_438_ATTESTATION.defaultValue
    )

    // Contract documents state management
    const { deleteFile, uploadFile, scanFile, getKey, getS3URL } = useS3()
    const [fileItems, setFileItems] = useState<FileItemT[]>([]) // eventually this will include files from api
    const hasValidFiles =
        fileItems.length > 0 &&
        fileItems.every((item) => item.status === 'UPLOAD_COMPLETE')
    const hasLoadingFiles =
        fileItems.some((item) => item.status === 'PENDING') ||
        fileItems.some((item) => item.status === 'SCANNING')
    const showFileUploadError = shouldValidate && !hasValidFiles
    const documentsErrorMessage =
        showFileUploadError && hasLoadingFiles
            ? 'You must wait for all documents to finish uploading before continuing'
            : showFileUploadError && fileItems.length === 0
              ? ' You must upload at least one document'
              : showFileUploadError && !hasValidFiles
                ? ' You must remove all documents with error messages before continuing'
                : undefined
    const documentsErrorKey =
        fileItems.length === 0 ? 'documents' : '#file-items-list'

    // Error summary state management
    const errorSummaryHeadingRef = React.useRef<HTMLHeadingElement>(null)
    const [focusErrorSummaryHeading, setFocusErrorSummaryHeading] =
        React.useState(false)

    useEffect(() => {
        // Focus the error summary heading only if we are displaying
        // validation errors and the heading element exists
        if (focusErrorSummaryHeading && errorSummaryHeadingRef.current) {
            errorSummaryHeadingRef.current.focus()
        }
        setFocusErrorSummaryHeading(false)
    }, [focusErrorSummaryHeading])

    if (interimState || !draftSubmission)
        return <ErrorOrLoadingPage state={interimState || 'GENERIC_ERROR'} />
    const fileItemsFromDraftSubmission: FileItemT[] | undefined =
        draftSubmission &&
        draftSubmission.contractDocuments.map((doc) => {
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

    const onFileItemsUpdate = async ({
        fileItems,
    }: {
        fileItems: FileItemT[]
    }) => {
        setFileItems(fileItems)
    }

    const handleDeleteFile = async (key: string) => {
        const isSubmittedFile =
            previousDocuments &&
            Boolean(
                previousDocuments.some((previousKey) => previousKey === key)
            )

        if (!isSubmittedFile) {
            const result = await deleteFile(key, 'HEALTH_PLAN_DOCS')
            if (isS3Error(result)) {
                throw new Error(`Error in S3 key: ${key}`)
            }
        }
    }

    const handleUploadFile = async (file: File): Promise<S3FileData> => {
        const s3Key = await uploadFile(file, 'HEALTH_PLAN_DOCS')

        if (isS3Error(s3Key)) {
            throw new Error(`Error in S3: ${file.name}`)
        }

        const s3URL = await getS3URL(s3Key, file.name, 'HEALTH_PLAN_DOCS')
        return { key: s3Key, s3URL: s3URL }
    }

    const handleScanFile = async (key: string): Promise<void | Error> => {
        try {
            await scanFile(key, 'HEALTH_PLAN_DOCS')
        } catch (e) {
            if (isS3Error(e)) {
                throw new Error(`Error in S3: ${key}`)
            }
            throw new Error('Scanning error: Scanning retry timed out')
        }
    }

    const applicableProvisions =
        generateApplicableProvisionsList(draftSubmission)

    const applicableFederalAuthorities = isCHIPOnly(draftSubmission)
        ? federalAuthorityKeysForCHIP
        : federalAuthorityKeys

    const contractDetailsInitialValues: ContractDetailsFormValues = {
        contractExecutionStatus:
            draftSubmission?.contractExecutionStatus ?? undefined,
        contractDateStart:
            (draftSubmission &&
                formatForForm(draftSubmission.contractDateStart)) ??
            '',
        contractDateEnd:
            (draftSubmission &&
                formatForForm(draftSubmission.contractDateEnd)) ??
            '',
        managedCareEntities:
            (draftSubmission?.managedCareEntities as ManagedCareEntity[]) ?? [],
        federalAuthorities: draftSubmission?.federalAuthorities ?? [],
        inLieuServicesAndSettings: formatForForm(
            draftSubmission?.contractAmendmentInfo?.modifiedProvisions
                .inLieuServicesAndSettings
        ),

        modifiedBenefitsProvided: formatForForm(
            draftSubmission?.contractAmendmentInfo?.modifiedProvisions
                .modifiedBenefitsProvided
        ),
        modifiedGeoAreaServed: formatForForm(
            draftSubmission?.contractAmendmentInfo?.modifiedProvisions
                .modifiedGeoAreaServed
        ),
        modifiedMedicaidBeneficiaries: formatForForm(
            draftSubmission?.contractAmendmentInfo?.modifiedProvisions
                .modifiedMedicaidBeneficiaries
        ),
        modifiedRiskSharingStrategy: formatForForm(
            draftSubmission?.contractAmendmentInfo?.modifiedProvisions
                .modifiedRiskSharingStrategy
        ),
        modifiedIncentiveArrangements: formatForForm(
            draftSubmission?.contractAmendmentInfo?.modifiedProvisions
                .modifiedIncentiveArrangements
        ),
        modifiedWitholdAgreements: formatForForm(
            draftSubmission?.contractAmendmentInfo?.modifiedProvisions
                .modifiedWitholdAgreements
        ),
        modifiedStateDirectedPayments: formatForForm(
            draftSubmission?.contractAmendmentInfo?.modifiedProvisions
                .modifiedStateDirectedPayments
        ),
        modifiedPassThroughPayments: formatForForm(
            draftSubmission?.contractAmendmentInfo?.modifiedProvisions
                .modifiedPassThroughPayments
        ),
        modifiedPaymentsForMentalDiseaseInstitutions: formatForForm(
            draftSubmission?.contractAmendmentInfo?.modifiedProvisions
                .modifiedPaymentsForMentalDiseaseInstitutions
        ),
        modifiedMedicalLossRatioStandards: formatForForm(
            draftSubmission?.contractAmendmentInfo?.modifiedProvisions
                .modifiedMedicalLossRatioStandards
        ),
        modifiedOtherFinancialPaymentIncentive: formatForForm(
            draftSubmission?.contractAmendmentInfo?.modifiedProvisions
                .modifiedOtherFinancialPaymentIncentive
        ),
        modifiedEnrollmentProcess: formatForForm(
            draftSubmission?.contractAmendmentInfo?.modifiedProvisions
                .modifiedEnrollmentProcess
        ),
        modifiedGrevienceAndAppeal: formatForForm(
            draftSubmission?.contractAmendmentInfo?.modifiedProvisions
                .modifiedGrevienceAndAppeal
        ),
        modifiedNetworkAdequacyStandards: formatForForm(
            draftSubmission?.contractAmendmentInfo?.modifiedProvisions
                .modifiedNetworkAdequacyStandards
        ),
        modifiedLengthOfContract: formatForForm(
            draftSubmission?.contractAmendmentInfo?.modifiedProvisions
                .modifiedLengthOfContract
        ),
        modifiedNonRiskPaymentArrangements: formatForForm(
            draftSubmission?.contractAmendmentInfo?.modifiedProvisions
                .modifiedNonRiskPaymentArrangements
        ),
        statutoryRegulatoryAttestation: formatForForm(
            draftSubmission?.statutoryRegulatoryAttestation
        ),
        statutoryRegulatoryAttestationDescription: formatForForm(
            draftSubmission?.statutoryRegulatoryAttestationDescription
        ),
    }

    const showFieldErrors = (error?: FormError) =>
        shouldValidate && Boolean(error)

    const handleFormSubmit = async (
        values: ContractDetailsFormValues,
        setSubmitting: (isSubmitting: boolean) => void, // formik setSubmitting
        options: {
            shouldValidateDocuments: boolean
            redirectPath: string
        }
    ) => {
        // Currently documents validation happens (outside of the yup schema, which only handles the formik form data)
        // if there are any errors present in the documents list and we are in a validation state (relevant for Save as Draft) force user to clear validations to continue
        if (options.shouldValidateDocuments) {
            if (!hasValidFiles) {
                setShouldValidate(true)
                setFocusErrorSummaryHeading(true)
                setSubmitting(false)
                return
            }
        }

        const contractDocuments = fileItems.reduce(
            (formDataDocuments, fileItem) => {
                if (fileItem.status === 'UPLOAD_ERROR') {
                    console.info(
                        'Attempting to save files that failed upload, discarding invalid files'
                    )
                } else if (fileItem.status === 'SCANNING_ERROR') {
                    console.info(
                        'Attempting to save files that failed scanning, discarding invalid files'
                    )
                } else if (fileItem.status === 'DUPLICATE_NAME_ERROR') {
                    console.info(
                        'Attempting to save files that are duplicate names, discarding duplicate'
                    )
                } else if (!fileItem.s3URL) {
                    console.info(
                        'Attempting to save a seemingly valid file item is not yet uploaded to S3, this should not happen on form submit. Discarding file.'
                    )
                } else if (!fileItem.sha256) {
                    console.info(
                        'Attempting to save a seemingly valid file item with no sha. this should not happen on form submit. Discarding file.'
                    )
                } else {
                    formDataDocuments.push({
                        name: fileItem.name,
                        s3URL: fileItem.s3URL,
                        sha256: fileItem.sha256,
                    })
                }
                return formDataDocuments
            },
            [] as SubmissionDocument[]
        )

        draftSubmission.contractExecutionStatus = values.contractExecutionStatus
        draftSubmission.contractDateStart = formatFormDateForDomain(
            values.contractDateStart
        )
        draftSubmission.contractDateEnd = formatFormDateForDomain(
            values.contractDateEnd
        )
        draftSubmission.managedCareEntities = values.managedCareEntities
        draftSubmission.federalAuthorities = values.federalAuthorities
        draftSubmission.contractDocuments = contractDocuments
        draftSubmission.statutoryRegulatoryAttestation = formatYesNoForProto(
            values.statutoryRegulatoryAttestation
        )
        // If contract is in compliance, we set the description to undefined. This clears out previous non-compliance description
        draftSubmission.statutoryRegulatoryAttestationDescription =
            values.statutoryRegulatoryAttestationDescription

        if (isContractWithProvisions(draftSubmission)) {
            draftSubmission.contractAmendmentInfo = {
                modifiedProvisions: {
                    inLieuServicesAndSettings: formatYesNoForProto(
                        values.inLieuServicesAndSettings
                    ),
                    modifiedBenefitsProvided: formatYesNoForProto(
                        values.modifiedBenefitsProvided
                    ),
                    modifiedGeoAreaServed: formatYesNoForProto(
                        values.modifiedGeoAreaServed
                    ),
                    modifiedMedicaidBeneficiaries: formatYesNoForProto(
                        values.modifiedMedicaidBeneficiaries
                    ),
                    modifiedRiskSharingStrategy: formatYesNoForProto(
                        values.modifiedRiskSharingStrategy
                    ),
                    modifiedIncentiveArrangements: formatYesNoForProto(
                        values.modifiedIncentiveArrangements
                    ),
                    modifiedWitholdAgreements: formatYesNoForProto(
                        values.modifiedWitholdAgreements
                    ),
                    modifiedStateDirectedPayments: formatYesNoForProto(
                        values.modifiedStateDirectedPayments
                    ),
                    modifiedPassThroughPayments: formatYesNoForProto(
                        values.modifiedPassThroughPayments
                    ),
                    modifiedPaymentsForMentalDiseaseInstitutions:
                        formatYesNoForProto(
                            values.modifiedPaymentsForMentalDiseaseInstitutions
                        ),
                    modifiedMedicalLossRatioStandards: formatYesNoForProto(
                        values.modifiedMedicalLossRatioStandards
                    ),
                    modifiedOtherFinancialPaymentIncentive: formatYesNoForProto(
                        values.modifiedOtherFinancialPaymentIncentive
                    ),
                    modifiedEnrollmentProcess: formatYesNoForProto(
                        values.modifiedEnrollmentProcess
                    ),
                    modifiedGrevienceAndAppeal: formatYesNoForProto(
                        values.modifiedGrevienceAndAppeal
                    ),
                    modifiedNetworkAdequacyStandards: formatYesNoForProto(
                        values.modifiedNetworkAdequacyStandards
                    ),
                    modifiedLengthOfContract: formatYesNoForProto(
                        values.modifiedLengthOfContract
                    ),
                    modifiedNonRiskPaymentArrangements: formatYesNoForProto(
                        values.modifiedNonRiskPaymentArrangements
                    ),
                },
            }
        } else {
            draftSubmission.contractAmendmentInfo = undefined
        }

        try {
            const updatedSubmission = await updateDraft(draftSubmission)
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
        }
    }
    return (
        <>
            <div className={styles.stepIndicator}>
                <DynamicStepIndicator
                    formPages={activeFormPages(draftSubmission)}
                    currentFormPage={currentRoute}
                />
                <PageBannerAlerts
                    loggedInUser={loggedInUser}
                    unlockedInfo={unlockInfo}
                    showPageErrorMessage={showPageErrorMessage ?? false}
                />
            </div>
            <FormContainer id="state-submission-form-page">
                <Formik
                    initialValues={contractDetailsInitialValues}
                    onSubmit={(values, { setSubmitting }) => {
                        return handleFormSubmit(values, setSubmitting, {
                            shouldValidateDocuments: true,
                            redirectPath:
                                draftSubmission.submissionType ===
                                'CONTRACT_ONLY'
                                    ? `../contacts`
                                    : `../rate-details`,
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
                                aria-label="Contract Details Form"
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

                                    {shouldValidate && (
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
                                    )}

                                    <FormGroup
                                        error={showFileUploadError}
                                        className="margin-top-0"
                                    >
                                        <FileUpload
                                            id="documents"
                                            name="documents"
                                            label="Upload contract"
                                            aria-required
                                            error={documentsErrorMessage}
                                            hint={
                                                <span
                                                    className={
                                                        styles.guidanceTextBlock
                                                    }
                                                >
                                                    <Link
                                                        aria-label="Document definitions and requirements (opens in new window)"
                                                        href={
                                                            '/help#key-documents'
                                                        }
                                                        variant="external"
                                                        target="_blank"
                                                    >
                                                        Document definitions and
                                                        requirements
                                                    </Link>
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
                                            uploadFile={handleUploadFile}
                                            scanFile={handleScanFile}
                                            deleteFile={handleDeleteFile}
                                            onFileItemsUpdate={
                                                onFileItemsUpdate
                                            }
                                        />
                                    </FormGroup>
                                    {contract438Attestation && (
                                        <FormGroup
                                            error={showFieldErrors(
                                                errors.statutoryRegulatoryAttestation
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
                                                {showFieldErrors(
                                                    errors.statutoryRegulatoryAttestation
                                                ) && (
                                                    <PoliteErrorMessage>
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
                                                />
                                                <FieldRadio
                                                    name="statutoryRegulatoryAttestation"
                                                    label={
                                                        StatutoryRegulatoryAttestation.NO
                                                    }
                                                    id="statutoryRegulatoryAttestationNo"
                                                    value={'NO'}
                                                    aria-required
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
                                                    showError={showFieldErrors(
                                                        errors.statutoryRegulatoryAttestationDescription
                                                    )}
                                                    hint={
                                                        <Link
                                                            variant="external"
                                                            asCustom={
                                                                ReactRouterLink
                                                            }
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
                                                        </Link>
                                                    }
                                                />
                                            </div>
                                        )}
                                    <FormGroup
                                        error={showFieldErrors(
                                            errors.contractExecutionStatus
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
                                            {showFieldErrors(
                                                errors.contractExecutionStatus
                                            ) && (
                                                <PoliteErrorMessage>
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
                                            />
                                            <FieldRadio
                                                id="unexecutedContract"
                                                name="contractExecutionStatus"
                                                label="Unexecuted by some or all parties"
                                                aria-required
                                                value={'UNEXECUTED'}
                                            />
                                        </Fieldset>
                                    </FormGroup>
                                    {
                                        <>
                                            <FormGroup
                                                error={
                                                    showFieldErrors(
                                                        errors.contractDateStart
                                                    ) ||
                                                    showFieldErrors(
                                                        errors.contractDateEnd
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
                                                    {showFieldErrors(
                                                        errors.contractDateStart ||
                                                            errors.contractDateEnd
                                                    ) && (
                                                        <ContractDatesErrorMessage
                                                            values={values}
                                                            validationErrorMessage={
                                                                errors.contractDateStart ||
                                                                errors.contractDateEnd ||
                                                                'Invalid date'
                                                            }
                                                        />
                                                    )}
                                                    <Link
                                                        aria-label="Effective date guidance (opens in new window)"
                                                        href={
                                                            '/help#effective-date-guidance'
                                                        }
                                                        variant="external"
                                                        target="_blank"
                                                    >
                                                        Effective date guidance
                                                    </Link>
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
                                                error={showFieldErrors(
                                                    errors.managedCareEntities
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
                                                    {showFieldErrors(
                                                        errors.managedCareEntities
                                                    ) && (
                                                        <PoliteErrorMessage>
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
                                                    />
                                                    <FieldCheckbox
                                                        id="prepaidInpatientHealthPlan"
                                                        name="managedCareEntities"
                                                        label={
                                                            ManagedCareEntityRecord.PIHP
                                                        }
                                                        value="PIHP"
                                                    />
                                                    <FieldCheckbox
                                                        id="prepaidAmbulatoryHealthPlans"
                                                        name="managedCareEntities"
                                                        label={
                                                            ManagedCareEntityRecord.PAHP
                                                        }
                                                        value="PAHP"
                                                    />
                                                    <FieldCheckbox
                                                        id="primaryCareCaseManagementEntity"
                                                        name="managedCareEntities"
                                                        label={
                                                            ManagedCareEntityRecord.PCCM
                                                        }
                                                        value="PCCM"
                                                    />
                                                </Fieldset>
                                            </FormGroup>

                                            <FormGroup
                                                error={showFieldErrors(
                                                    errors.federalAuthorities
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
                                                    {showFieldErrors(
                                                        errors.federalAuthorities
                                                    ) && (
                                                        <PoliteErrorMessage>
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
                                                                    showError={showFieldErrors(
                                                                        errors[
                                                                            modifiedProvisionName
                                                                        ]
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
                                        // do not need to trigger validations if file list is empty
                                        if (fileItems.length === 0) {
                                            await handleFormSubmit(
                                                values,
                                                setSubmitting,
                                                {
                                                    shouldValidateDocuments:
                                                        false,
                                                    redirectPath:
                                                        RoutesRecord.DASHBOARD_SUBMISSIONS,
                                                }
                                            )
                                        } else {
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
                                        }
                                    }}
                                    backOnClick={async () => {
                                        // do not need to validate or resubmit if no documents are uploaded
                                        if (fileItems.length === 0) {
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
                                    disableContinue={showFileUploadError}
                                    actionInProgress={isSubmitting}
                                />
                            </UswdsForm>
                        </>
                    )}
                </Formik>
            </FormContainer>
        </>
    )
}
