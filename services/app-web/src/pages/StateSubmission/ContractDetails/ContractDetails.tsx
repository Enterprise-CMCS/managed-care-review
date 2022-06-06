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
import { useNavigate } from 'react-router-dom'
import { Formik, FormikErrors } from 'formik'

import styles from '../StateSubmissionForm.module.scss'

import {
    FileUpload,
    S3FileData,
    FileItemT,
    FieldRadio,
    FieldCheckbox,
    FieldPreserveScrollPosition,
    ErrorSummary,
    PoliteErrorMessage,
    FieldYesNo,
} from '../../../components'
import {
    formatForForm,
    formatFormDateForDomain,
    formatUserInputDate,
    isDateRangeEmpty,
} from '../../../formHelpers'
import {
    Document,
    ContractType,
    ContractExecutionStatus,
    FederalAuthority,
} from '../../../gen/gqlClient'
import { useS3 } from '../../../contexts/S3Context'
import { isS3Error } from '../../../s3'

import { ContractDetailsFormSchema } from './ContractDetailsSchema'
import {
    ContractAmendmentInfo,
    ManagedCareEntity,
} from '../../../common-code/healthPlanFormDataType'
import {
    ManagedCareEntityRecord,
    FederalAuthorityRecord,
    ModifiedProvisionsRecord,
} from '../../../constants/healthPlanPackages'
import { PageActions } from '../PageActions'
import type { HealthPlanFormPageProps } from '../StateSubmissionForm'
import { formatYesNoForProto } from '../../../formHelpers/formatters'

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
    contractType: ContractType | undefined
    contractExecutionStatus: ContractExecutionStatus | undefined
    contractDateStart: string
    contractDateEnd: string
    managedCareEntities: ManagedCareEntity[]
    federalAuthorities: FederalAuthority[]
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
}
type FormError =
    FormikErrors<ContractDetailsFormValues>[keyof FormikErrors<ContractDetailsFormValues>]

export const ContractDetails = ({
    draftSubmission,
    showValidations = false,
    previousDocuments,
    updateDraft,
}: HealthPlanFormPageProps): React.ReactElement => {
    const [shouldValidate, setShouldValidate] = React.useState(showValidations)
    const navigate = useNavigate()
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
                    documentCategories: doc.documentCategories,
                }
            }
            return {
                id: uuidv4(),
                name: doc.name,
                key: key,
                s3URL: doc.s3URL,
                status: 'UPLOAD_COMPLETE',
                documentCategories: doc.documentCategories,
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
            const result = await deleteFile(key)
            if (isS3Error(result)) {
                throw new Error(`Error in S3 key: ${key}`)
            }
        }
        return
    }

    const handleUploadFile = async (file: File): Promise<S3FileData> => {
        const s3Key = await uploadFile(file)

        if (isS3Error(s3Key)) {
            throw new Error(`Error in S3: ${file.name}`)
        }

        const s3URL = await getS3URL(s3Key, file.name)
        return { key: s3Key, s3URL: s3URL }
    }

    const handleScanFile = async (key: string): Promise<void | Error> => {
        try {
            await scanFile(key)
        } catch (e) {
            if (isS3Error(e)) {
                throw new Error(`Error in S3: ${key}`)
            }
            throw new Error('Scanning error: Scanning retry timed out')
        }
    }

    const contractDetailsInitialValues: ContractDetailsFormValues = {
        contractType: draftSubmission?.contractType ?? undefined,
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

        modifiedBenefitsProvided: formatForForm(
            draftSubmission?.contractAmendmentInfo?.modifiedBenefitsProvided
        ),
        modifiedGeoAreaServed: formatForForm(
            draftSubmission?.contractAmendmentInfo?.modifiedGeoAreaServed
        ),
        modifiedMedicaidBeneficiaries: formatForForm(
            draftSubmission?.contractAmendmentInfo
                ?.modifiedMedicaidBeneficiaries
        ),
        modifiedRiskSharingStrategy: formatForForm(
            draftSubmission?.contractAmendmentInfo?.modifiedRiskSharingStrategy
        ),
        modifiedIncentiveArrangements: formatForForm(
            draftSubmission?.contractAmendmentInfo
                ?.modifiedIncentiveArrangements
        ),
        modifiedWitholdAgreements: formatForForm(
            draftSubmission?.contractAmendmentInfo?.modifiedWitholdAgreements
        ),
        modifiedStateDirectedPayments: formatForForm(
            draftSubmission?.contractAmendmentInfo
                ?.modifiedStateDirectedPayments
        ),
        modifiedPassThroughPayments: formatForForm(
            draftSubmission?.contractAmendmentInfo?.modifiedPassThroughPayments
        ),
        modifiedPaymentsForMentalDiseaseInstitutions: formatForForm(
            draftSubmission?.contractAmendmentInfo
                ?.modifiedPaymentsForMentalDiseaseInstitutions
        ),
        modifiedMedicalLossRatioStandards: formatForForm(
            draftSubmission?.contractAmendmentInfo
                ?.modifiedMedicalLossRatioStandards
        ),
        modifiedOtherFinancialPaymentIncentive: formatForForm(
            draftSubmission?.contractAmendmentInfo
                ?.modifiedOtherFinancialPaymentIncentive
        ),
        modifiedEnrollmentProcess: formatForForm(
            draftSubmission?.contractAmendmentInfo?.modifiedEnrollmentProcess
        ),
        modifiedGrevienceAndAppeal: formatForForm(
            draftSubmission?.contractAmendmentInfo?.modifiedGrevienceAndAppeal
        ),
        modifiedNetworkAdequacyStandards: formatForForm(
            draftSubmission?.contractAmendmentInfo
                ?.modifiedNetworkAdequacyStandards
        ),
        modifiedLengthOfContract: formatForForm(
            draftSubmission?.contractAmendmentInfo?.modifiedLengthOfContract
        ),
        modifiedNonRiskPaymentArrangements: formatForForm(
            draftSubmission?.contractAmendmentInfo
                ?.modifiedNonRiskPaymentArrangements
        ),
    }

    const showFieldErrors = (error?: FormError) =>
        shouldValidate && Boolean(error)

    const isContractTypeEmpty = (values: ContractDetailsFormValues): boolean =>
        values.contractType === undefined

    const isContractAmendmentSelected = (
        values: ContractDetailsFormValues
    ): boolean => values.contractType === 'AMENDMENT'

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
                    console.log(
                        'Attempting to save files that failed upload, discarding invalid files'
                    )
                } else if (fileItem.status === 'SCANNING_ERROR') {
                    console.log(
                        'Attempting to save files that failed scanning, discarding invalid files'
                    )
                } else if (fileItem.status === 'DUPLICATE_NAME_ERROR') {
                    console.log(
                        'Attempting to save files that are duplicate names, discarding duplicate'
                    )
                } else if (!fileItem.s3URL)
                    console.log(
                        'Attempting to save a seemingly valid file item is not yet uploaded to S3, this should not happen on form submit. Discarding file.'
                    )
                else {
                    formDataDocuments.push({
                        name: fileItem.name,
                        s3URL: fileItem.s3URL,
                        documentCategories: ['CONTRACT'],
                    })
                }
                return formDataDocuments
            },
            [] as Document[]
        )

        draftSubmission.contractType = values.contractType
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

        if (values.contractType === 'AMENDMENT') {
            draftSubmission.contractAmendmentInfo = {
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
            }
        } else {
            draftSubmission.contractAmendmentInfo = undefined
        }

        try {
            const updatedSubmission = await updateDraft(draftSubmission)
            if (updatedSubmission instanceof Error) {
                setSubmitting(false)
                console.log(
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

    // I put these names here so that I could get the types right for the
    // .map() below.
    const yesNoNames: (keyof ContractAmendmentInfo)[] = [
        'modifiedBenefitsProvided',
        'modifiedGeoAreaServed',
        'modifiedMedicaidBeneficiaries',
        'modifiedRiskSharingStrategy',
        'modifiedIncentiveArrangements',
        'modifiedWitholdAgreements',
        'modifiedStateDirectedPayments',
        'modifiedPassThroughPayments',
        'modifiedPaymentsForMentalDiseaseInstitutions',
        'modifiedMedicalLossRatioStandards',
        'modifiedOtherFinancialPaymentIncentive',
        'modifiedEnrollmentProcess',
        'modifiedGrevienceAndAppeal',
        'modifiedNetworkAdequacyStandards',
        'modifiedLengthOfContract',
        'modifiedNonRiskPaymentArrangements',
    ]

    return (
        <Formik
            initialValues={contractDetailsInitialValues}
            onSubmit={(values, { setSubmitting }) => {
                return handleFormSubmit(values, setSubmitting, {
                    shouldValidateDocuments: true,
                    redirectPath:
                        draftSubmission.submissionType === 'CONTRACT_ONLY'
                            ? `../contacts`
                            : `../rate-details`,
                })
            }}
            validationSchema={ContractDetailsFormSchema}
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
                            <legend className="srOnly">Contract Details</legend>
                            <span id="form-guidance">
                                All fields are required
                            </span>

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

                            <FormGroup error={showFileUploadError}>
                                <FileUpload
                                    id="documents"
                                    name="documents"
                                    label="Upload contract"
                                    renderMode="list"
                                    aria-required
                                    error={documentsErrorMessage}
                                    hint={
                                        <>
                                            <Link
                                                aria-label="Document definitions and requirements (opens in new window)"
                                                href={'/help#key-documents'}
                                                variant="external"
                                                target="_blank"
                                            >
                                                Document definitions and
                                                requirements
                                            </Link>
                                            <span>
                                                This input only accepts PDF,
                                                CSV, DOC, DOCX, XLS, XLSX files.
                                            </span>
                                        </>
                                    }
                                    accept="application/pdf,text/csv,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                                    initialItems={fileItemsFromDraftSubmission}
                                    uploadFile={handleUploadFile}
                                    scanFile={handleScanFile}
                                    deleteFile={handleDeleteFile}
                                    onFileItemsUpdate={onFileItemsUpdate}
                                />
                            </FormGroup>
                            <FormGroup
                                error={showFieldErrors(errors.contractType)}
                            >
                                <FieldPreserveScrollPosition
                                    fieldName={
                                        'contractType' as keyof ContractDetailsFormValues
                                    }
                                />
                                <Fieldset
                                    role="radiogroup"
                                    aria-required
                                    className={styles.radioGroup}
                                    legend="Contract action type"
                                    id="contractType"
                                >
                                    {showFieldErrors(errors.contractType) && (
                                        <PoliteErrorMessage>
                                            {errors.contractType}
                                        </PoliteErrorMessage>
                                    )}
                                    <FieldRadio
                                        id="baseContract"
                                        name="contractType"
                                        label="Base contract"
                                        aria-required
                                        value={'BASE'}
                                        checked={values.contractType === 'BASE'}
                                    />
                                    <FieldRadio
                                        id="amendmentContract"
                                        name="contractType"
                                        label="Amendment to base contract"
                                        aria-required
                                        value={'AMENDMENT'}
                                        checked={
                                            values.contractType === 'AMENDMENT'
                                        }
                                    />
                                </Fieldset>
                            </FormGroup>
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
                                    {showFieldErrors(
                                        errors.contractExecutionStatus
                                    ) && (
                                        <PoliteErrorMessage>
                                            {errors.contractExecutionStatus}
                                        </PoliteErrorMessage>
                                    )}
                                    <FieldRadio
                                        id="executedContract"
                                        name="contractExecutionStatus"
                                        label="Fully executed"
                                        aria-required
                                        value={'EXECUTED'}
                                        checked={
                                            values.contractExecutionStatus ===
                                            'EXECUTED'
                                        }
                                    />
                                    <FieldRadio
                                        id="unexecutedContract"
                                        name="contractExecutionStatus"
                                        label="Unexecuted by some or all parties"
                                        aria-required
                                        value={'UNEXECUTED'}
                                        checked={
                                            values.contractExecutionStatus ===
                                            'UNEXECUTED'
                                        }
                                    />
                                </Fieldset>
                            </FormGroup>
                            {!isContractTypeEmpty(values) && (
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
                                                isContractAmendmentSelected(
                                                    values
                                                )
                                                    ? 'Amendment effective dates'
                                                    : 'Contract effective dates'
                                            }
                                        >
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
                                                    'aria-required': true,
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
                                                    'aria-required': true,
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
                                            <Link
                                                variant="external"
                                                href={
                                                    'https://www.medicaid.gov/medicaid/managed-care/managed-care-entities/index.html'
                                                }
                                                target="_blank"
                                            >
                                                Managed Care entity definitions
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
                                                    {errors.managedCareEntities}
                                                </PoliteErrorMessage>
                                            )}
                                            <FieldCheckbox
                                                id="managedCareOrganization"
                                                name="managedCareEntities"
                                                label={
                                                    ManagedCareEntityRecord.MCO
                                                }
                                                value="MCO"
                                                checked={values.managedCareEntities.includes(
                                                    'MCO'
                                                )}
                                            />
                                            <FieldCheckbox
                                                id="prepaidInpatientHealthPlan"
                                                name="managedCareEntities"
                                                label={
                                                    ManagedCareEntityRecord.PIHP
                                                }
                                                value="PIHP"
                                                checked={values.managedCareEntities.includes(
                                                    'PIHP'
                                                )}
                                            />
                                            <FieldCheckbox
                                                id="prepaidAmbulatoryHealthPlans"
                                                name="managedCareEntities"
                                                label={
                                                    ManagedCareEntityRecord.PAHP
                                                }
                                                value="PAHP"
                                                checked={values.managedCareEntities.includes(
                                                    'PAHP'
                                                )}
                                            />
                                            <FieldCheckbox
                                                id="primaryCareCaseManagementEntity"
                                                name="managedCareEntities"
                                                label={
                                                    ManagedCareEntityRecord.PCCM
                                                }
                                                value="PCCM"
                                                checked={values.managedCareEntities.includes(
                                                    'PCCM'
                                                )}
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
                                                    {errors.federalAuthorities}
                                                </PoliteErrorMessage>
                                            )}
                                            <FieldCheckbox
                                                id="1932aStatePlanAuthority"
                                                name="federalAuthorities"
                                                label={
                                                    FederalAuthorityRecord.STATE_PLAN
                                                }
                                                value={'STATE_PLAN'}
                                                checked={values.federalAuthorities.includes(
                                                    'STATE_PLAN'
                                                )}
                                            />
                                            <FieldCheckbox
                                                id="1915bWaiverAuthority"
                                                name="federalAuthorities"
                                                label={
                                                    FederalAuthorityRecord.WAIVER_1915B
                                                }
                                                value={'WAIVER_1915B'}
                                                checked={values.federalAuthorities.includes(
                                                    'WAIVER_1915B'
                                                )}
                                            />
                                            <FieldCheckbox
                                                id="1115WaiverAuthority"
                                                name="federalAuthorities"
                                                label={
                                                    FederalAuthorityRecord.WAIVER_1115
                                                }
                                                value={'WAIVER_1115'}
                                                checked={values.federalAuthorities.includes(
                                                    'WAIVER_1115'
                                                )}
                                            />
                                            <FieldCheckbox
                                                id="1915aVoluntaryAuthority"
                                                name="federalAuthorities"
                                                label={
                                                    FederalAuthorityRecord.VOLUNTARY
                                                }
                                                value={'VOLUNTARY'}
                                                checked={values.federalAuthorities.includes(
                                                    'VOLUNTARY'
                                                )}
                                            />
                                            <FieldCheckbox
                                                id="1937BenchmarkAuthority"
                                                name="federalAuthorities"
                                                label={
                                                    FederalAuthorityRecord.BENCHMARK
                                                }
                                                value={'BENCHMARK'}
                                                checked={values.federalAuthorities.includes(
                                                    'BENCHMARK'
                                                )}
                                            />
                                            <FieldCheckbox
                                                id="titleXXISeparateChipStatePlanAuthority"
                                                name="federalAuthorities"
                                                label={
                                                    FederalAuthorityRecord.TITLE_XXI
                                                }
                                                value={'TITLE_XXI'}
                                                checked={values.federalAuthorities.includes(
                                                    'TITLE_XXI'
                                                )}
                                            />
                                        </Fieldset>
                                    </FormGroup>
                                    {isContractAmendmentSelected(values) && (
                                        <FormGroup>
                                            <Fieldset
                                                aria-required
                                                legend="Does this contract action include new or modified provisions related to any of the following"
                                            >
                                                {yesNoNames.map(
                                                    (modifiedProvisionName) => (
                                                        <FieldYesNo
                                                            id={
                                                                modifiedProvisionName
                                                            }
                                                            name={
                                                                modifiedProvisionName
                                                            }
                                                            label={
                                                                ModifiedProvisionsRecord[
                                                                    modifiedProvisionName
                                                                ]
                                                            }
                                                            showError={showFieldErrors(
                                                                errors.modifiedBenefitsProvided
                                                            )}
                                                        />
                                                    )
                                                )}
                                            </Fieldset>
                                        </FormGroup>
                                    )}
                                </>
                            )}
                        </fieldset>

                        <PageActions
                            saveAsDraftOnClick={async () => {
                                // do not need to trigger validations if file list is empty
                                if (fileItems.length === 0) {
                                    await handleFormSubmit(
                                        values,
                                        setSubmitting,
                                        {
                                            shouldValidateDocuments: false,
                                            redirectPath: '/dashboard',
                                        }
                                    )
                                } else {
                                    await handleFormSubmit(
                                        values,
                                        setSubmitting,
                                        {
                                            shouldValidateDocuments: true,
                                            redirectPath: '/dashboard',
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
                                            shouldValidateDocuments: false,
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
    )
}
