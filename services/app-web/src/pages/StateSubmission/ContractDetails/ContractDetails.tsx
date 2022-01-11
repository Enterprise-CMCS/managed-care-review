import React, { useEffect, useState } from 'react'
import dayjs from 'dayjs'
import {
    Form as UswdsForm,
    FormGroup,
    Fieldset,
    Link,
    DateRangePicker,
    ErrorMessage,
} from '@trussworks/react-uswds'
import { v4 as uuidv4 } from 'uuid'
import { Link as ReactRouterLink, useHistory } from 'react-router-dom'
import { Formik, FormikErrors } from 'formik'

import styles from '../StateSubmissionForm.module.scss'

import {
    FieldRadio,
    FieldCheckbox,
    FieldTextInput,
    ErrorSummary,
} from '../../../components/Form'
import {
    FileUpload,
    S3FileData,
    FileItemT,
} from '../../../components/FileUpload'
import {
    formatForApi,
    formatForForm,
    formatUserInputDate,
    isDateRangeEmpty,
} from '../../../formHelpers'
import {
    Document,
    DraftSubmission,
    ContractType,
    FederalAuthority,
    CapitationRatesAmendedInfo,
    CapitationRatesAmendmentReason,
    UpdateDraftSubmissionInput,
} from '../../../gen/gqlClient'
import { useS3 } from '../../../contexts/S3Context'
import { isS3Error } from '../../../s3'

import { ContractDetailsFormSchema } from './ContractDetailsSchema'
import { ManagedCareEntity } from '../../../common-code/domain-models/DraftSubmissionType'
import { updatesFromSubmission } from '../updateSubmissionTransform'
import {
    AmendableItemsRecord,
    RateChangeReasonRecord,
    ManagedCareEntityRecord,
    FederalAuthorityRecord,
} from '../../../constants/submissions'
import { PageActions } from '../PageActions'

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
    <ErrorMessage>
        {isDateRangeEmpty(values.contractDateStart, values.contractDateEnd)
            ? 'You must provide a start and an end date'
            : validationErrorMessage}
    </ErrorMessage>
)

export interface ContractDetailsFormValues {
    contractType: ContractType | undefined
    contractDateStart: string
    contractDateEnd: string
    managedCareEntities: ManagedCareEntity[]
    itemsAmended: string[]
    otherItemAmended: string
    capitationRates: CapitationRatesAmendmentReason | undefined
    capitationRatesOther: string
    relatedToCovid19: string
    relatedToVaccination: string
    federalAuthorities: FederalAuthority[]
}
type FormError =
    FormikErrors<ContractDetailsFormValues>[keyof FormikErrors<ContractDetailsFormValues>]

export const ContractDetails = ({
    draftSubmission,
    showValidations = false,
    updateDraft,
    formAlert = undefined,
}: {
    draftSubmission: DraftSubmission
    showValidations?: boolean
    updateDraft: (
        input: UpdateDraftSubmissionInput
    ) => Promise<DraftSubmission | undefined>
    formAlert?: React.ReactElement
}): React.ReactElement => {
    const [shouldValidate, setShouldValidate] = React.useState(showValidations)
    const history = useHistory()

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
                }
            }
            return {
                id: uuidv4(),
                name: doc.name,
                key: key,
                s3URL: doc.s3URL,
                status: 'UPLOAD_COMPLETE',
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
        const result = await deleteFile(key)
        if (isS3Error(result)) {
            throw new Error(`Error in S3 key: ${key}`)
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
        itemsAmended:
            draftSubmission.contractAmendmentInfo?.itemsBeingAmended ?? [],
        otherItemAmended:
            draftSubmission.contractAmendmentInfo?.otherItemBeingAmended ?? '',
        capitationRates:
            draftSubmission.contractAmendmentInfo?.capitationRatesAmendedInfo
                ?.reason ?? undefined,
        capitationRatesOther:
            draftSubmission.contractAmendmentInfo?.capitationRatesAmendedInfo
                ?.otherReason ?? '',
        relatedToCovid19: formatForForm(
            draftSubmission.contractAmendmentInfo?.relatedToCovid19 ?? null
        ),
        relatedToVaccination: formatForForm(
            draftSubmission.contractAmendmentInfo?.relatedToVaccination ?? null
        ),
        federalAuthorities: draftSubmission?.federalAuthorities ?? [],
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

        const updatedDraft = updatesFromSubmission(draftSubmission)
        updatedDraft.contractType = values.contractType
        updatedDraft.contractDateStart = values.contractDateStart || null
        updatedDraft.contractDateEnd = values.contractDateEnd || null
        updatedDraft.managedCareEntities = values.managedCareEntities
        updatedDraft.federalAuthorities = values.federalAuthorities
        updatedDraft.contractDocuments = contractDocuments

        if (values.contractType === 'AMENDMENT') {
            const relatedToCovid = values.relatedToCovid19 === 'YES'
            const relatedToVaccine = relatedToCovid
                ? values.relatedToVaccination === 'YES'
                : null

            const amendedOther = formatForApi(values.otherItemAmended)

            let capitationInfo: CapitationRatesAmendedInfo | undefined =
                undefined
            if (values.itemsAmended.includes('CAPITATION_RATES')) {
                capitationInfo = {
                    reason: values.capitationRates,
                    otherReason: formatForApi(values.capitationRatesOther),
                }
            }

            updatedDraft.contractAmendmentInfo = {
                itemsBeingAmended: values.itemsAmended,
                otherItemBeingAmended: amendedOther,
                capitationRatesAmendedInfo: capitationInfo,
                relatedToCovid19: relatedToCovid,
                relatedToVaccination: relatedToVaccine,
            }
        } else {
            updatedDraft.contractAmendmentInfo = null
        }

        try {
            const updatedSubmission = await updateDraft({
                submissionID: draftSubmission.id,
                draftSubmissionUpdates: updatedDraft,
            })
            if (updatedSubmission) {
                history.push(options.redirectPath)
            }
        } catch (serverError) {
            setSubmitting(false)
        }
    }

    return (
        <Formik
            initialValues={contractDetailsInitialValues}
            onSubmit={(values, { setSubmitting }) => {
                return handleFormSubmit(values, setSubmitting, {
                    shouldValidateDocuments: true,
                    redirectPath:
                        draftSubmission.submissionType === 'CONTRACT_ONLY'
                            ? 'contacts'
                            : 'rate-details',
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
                            {formAlert && formAlert}
                            <span id="form-guidance">
                                All fields are required
                            </span>

                            {shouldValidate && (
                                <ErrorSummary
                                    errors={
                                        documentsErrorMessage
                                            ? {
                                                  documents:
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
                                    aria-required
                                    error={documentsErrorMessage}
                                    hint={
                                        <>
                                            <Link
                                                aria-label="Document definitions and requirements (opens in new window)"
                                                href={
                                                    '/help#document-definitions-requirements'
                                                }
                                                variant="external"
                                                target="_blank"
                                            >
                                                Document definitions and
                                                requirements
                                            </Link>
                                            <span className="srOnly">
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
                                <Fieldset
                                    aria-required
                                    className={styles.radioGroup}
                                    legend="Contract action type"
                                >
                                    {showFieldErrors(errors.contractType) && (
                                        <ErrorMessage>
                                            {errors.contractType}
                                        </ErrorMessage>
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
                                                <ErrorMessage>
                                                    {errors.managedCareEntities}
                                                </ErrorMessage>
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
                                            legend="Federal authority your program operates under"
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
                                                <ErrorMessage>
                                                    {errors.federalAuthorities}
                                                </ErrorMessage>
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
                                        <>
                                            <FormGroup
                                                error={showFieldErrors(
                                                    errors.itemsAmended
                                                )}
                                            >
                                                <Fieldset
                                                    aria-required
                                                    legend="Items being amended"
                                                >
                                                    <Link
                                                        variant="external"
                                                        asCustom={
                                                            ReactRouterLink
                                                        }
                                                        to={{
                                                            pathname: '/help',
                                                            hash: '#items-being-amended-definitions',
                                                        }}
                                                        target="_blank"
                                                    >
                                                        Items being amended
                                                        definitions
                                                    </Link>
                                                    <div className="usa-hint">
                                                        <span>
                                                            Check all that apply
                                                        </span>
                                                    </div>
                                                    {showFieldErrors(
                                                        errors.itemsAmended
                                                    ) && (
                                                        <ErrorMessage>
                                                            {
                                                                errors.itemsAmended
                                                            }
                                                        </ErrorMessage>
                                                    )}
                                                    <FieldCheckbox
                                                        id="benefitsProvided"
                                                        name="itemsAmended"
                                                        label={
                                                            AmendableItemsRecord.BENEFITS_PROVIDED
                                                        }
                                                        value="BENEFITS_PROVIDED"
                                                        checked={values.itemsAmended.includes(
                                                            'BENEFITS_PROVIDED'
                                                        )}
                                                    />
                                                    <FieldCheckbox
                                                        id="capitationRates"
                                                        name="itemsAmended"
                                                        label={
                                                            AmendableItemsRecord.CAPITATION_RATES
                                                        }
                                                        value="CAPITATION_RATES"
                                                        checked={values.itemsAmended.includes(
                                                            'CAPITATION_RATES'
                                                        )}
                                                    />
                                                    {values.itemsAmended.includes(
                                                        'CAPITATION_RATES'
                                                    ) && (
                                                        <div>
                                                            <FormGroup
                                                                className={
                                                                    showFieldErrors(
                                                                        errors.capitationRates
                                                                    )
                                                                        ? styles.nestedOptionsError
                                                                        : styles.nestedOptions
                                                                }
                                                            >
                                                                <Fieldset
                                                                    aria-required
                                                                    legend="Select reason for capitation rate change"
                                                                >
                                                                    {showFieldErrors(
                                                                        errors.capitationRates
                                                                    ) && (
                                                                        <ErrorMessage>
                                                                            {
                                                                                errors.capitationRates
                                                                            }
                                                                        </ErrorMessage>
                                                                    )}
                                                                    <FieldRadio
                                                                        id="annualRateUpdate"
                                                                        name="capitationRates"
                                                                        label={
                                                                            RateChangeReasonRecord.ANNUAL
                                                                        }
                                                                        value={
                                                                            'ANNUAL'
                                                                        }
                                                                        checked={
                                                                            values.capitationRates ===
                                                                            'ANNUAL'
                                                                        }
                                                                    />
                                                                    <FieldRadio
                                                                        id="midYearUpdate"
                                                                        name="capitationRates"
                                                                        label={
                                                                            RateChangeReasonRecord.MIDYEAR
                                                                        }
                                                                        value={
                                                                            'MIDYEAR'
                                                                        }
                                                                        checked={
                                                                            values.capitationRates ===
                                                                            'MIDYEAR'
                                                                        }
                                                                    />
                                                                    <FieldRadio
                                                                        id="capitation-other"
                                                                        name="capitationRates"
                                                                        label={
                                                                            RateChangeReasonRecord.OTHER
                                                                        }
                                                                        value={
                                                                            'OTHER'
                                                                        }
                                                                        checked={
                                                                            values.capitationRates ===
                                                                            'OTHER'
                                                                        }
                                                                    />
                                                                    {values.capitationRates ===
                                                                        'OTHER' && (
                                                                        <FieldTextInput
                                                                            id="other-rates"
                                                                            label="Other capitation rate description"
                                                                            showError={showFieldErrors(
                                                                                errors.capitationRatesOther
                                                                            )}
                                                                            name="capitationRatesOther"
                                                                            type="text"
                                                                        />
                                                                    )}
                                                                </Fieldset>
                                                            </FormGroup>
                                                        </div>
                                                    )}
                                                    <FieldCheckbox
                                                        id="encounterData"
                                                        name="itemsAmended"
                                                        label={
                                                            AmendableItemsRecord.ENCOUNTER_DATA
                                                        }
                                                        value="ENCOUNTER_DATA"
                                                        checked={values.itemsAmended.includes(
                                                            'ENCOUNTER_DATA'
                                                        )}
                                                    />
                                                    <FieldCheckbox
                                                        id="enrolleeAccess"
                                                        name="itemsAmended"
                                                        label={
                                                            AmendableItemsRecord.ENROLLE_ACCESS
                                                        }
                                                        value="ENROLLE_ACCESS"
                                                        checked={values.itemsAmended.includes(
                                                            'ENROLLE_ACCESS'
                                                        )}
                                                    />
                                                    <FieldCheckbox
                                                        id="enrollmentDisenrollementProcess"
                                                        name="itemsAmended"
                                                        label={
                                                            AmendableItemsRecord.ENROLLMENT_PROCESS
                                                        }
                                                        value="ENROLLMENT_PROCESS"
                                                        checked={values.itemsAmended.includes(
                                                            'ENROLLMENT_PROCESS'
                                                        )}
                                                    />
                                                    <FieldCheckbox
                                                        id="financialIncentives"
                                                        name="itemsAmended"
                                                        label={
                                                            AmendableItemsRecord.FINANCIAL_INCENTIVES
                                                        }
                                                        value="FINANCIAL_INCENTIVES"
                                                        checked={values.itemsAmended.includes(
                                                            'FINANCIAL_INCENTIVES'
                                                        )}
                                                    />
                                                    <FieldCheckbox
                                                        id="geographicAreaServed"
                                                        name="itemsAmended"
                                                        label={
                                                            AmendableItemsRecord.GEO_AREA_SERVED
                                                        }
                                                        value="GEO_AREA_SERVED"
                                                        checked={values.itemsAmended.includes(
                                                            'GEO_AREA_SERVED'
                                                        )}
                                                    />
                                                    <FieldCheckbox
                                                        id="grievancesAndAppealsSystem"
                                                        name="itemsAmended"
                                                        label={
                                                            AmendableItemsRecord.GRIEVANCES_AND_APPEALS_SYSTEM
                                                        }
                                                        value="GRIEVANCES_AND_APPEALS_SYSTEM"
                                                        checked={values.itemsAmended.includes(
                                                            'GRIEVANCES_AND_APPEALS_SYSTEM'
                                                        )}
                                                    />
                                                    <FieldCheckbox
                                                        id="lengthOfContractPeriod"
                                                        name="itemsAmended"
                                                        label={
                                                            AmendableItemsRecord.LENGTH_OF_CONTRACT_PERIOD
                                                        }
                                                        value="LENGTH_OF_CONTRACT_PERIOD"
                                                        checked={values.itemsAmended.includes(
                                                            'LENGTH_OF_CONTRACT_PERIOD'
                                                        )}
                                                    />
                                                    <FieldCheckbox
                                                        id="nonriskPayment"
                                                        name="itemsAmended"
                                                        label={
                                                            AmendableItemsRecord.NON_RISK_PAYMENT
                                                        }
                                                        value="NON_RISK_PAYMENT"
                                                        checked={values.itemsAmended.includes(
                                                            'NON_RISK_PAYMENT'
                                                        )}
                                                    />
                                                    <FieldCheckbox
                                                        id="programIntegrity"
                                                        name="itemsAmended"
                                                        label={
                                                            AmendableItemsRecord.PROGRAM_INTEGRITY
                                                        }
                                                        value="PROGRAM_INTEGRITY"
                                                        checked={values.itemsAmended.includes(
                                                            'PROGRAM_INTEGRITY'
                                                        )}
                                                    />
                                                    <FieldCheckbox
                                                        id="qualityStandards"
                                                        name="itemsAmended"
                                                        label={
                                                            AmendableItemsRecord.QUALITY_STANDARDS
                                                        }
                                                        value="QUALITY_STANDARDS"
                                                        checked={values.itemsAmended.includes(
                                                            'QUALITY_STANDARDS'
                                                        )}
                                                    />
                                                    <FieldCheckbox
                                                        id="riskSharingMechanisms"
                                                        name="itemsAmended"
                                                        label={
                                                            AmendableItemsRecord.RISK_SHARING_MECHANISM
                                                        }
                                                        value="RISK_SHARING_MECHANISM"
                                                        checked={values.itemsAmended.includes(
                                                            'RISK_SHARING_MECHANISM'
                                                        )}
                                                    />
                                                    <FieldCheckbox
                                                        id="items-other"
                                                        name="itemsAmended"
                                                        label="Other (please describe)"
                                                        value="OTHER"
                                                        checked={values.itemsAmended.includes(
                                                            'OTHER'
                                                        )}
                                                    />
                                                    {values.itemsAmended.includes(
                                                        'OTHER'
                                                    ) && (
                                                        <div
                                                            className={
                                                                styles.nestedOptions
                                                            }
                                                        >
                                                            <FieldTextInput
                                                                id="other-items-amended"
                                                                name="otherItemAmended"
                                                                label="Other item description"
                                                                aria-required
                                                                showError={showFieldErrors(
                                                                    errors.otherItemAmended
                                                                )}
                                                                type="text"
                                                            />
                                                        </div>
                                                    )}
                                                </Fieldset>
                                            </FormGroup>
                                            {values.contractType ===
                                                'AMENDMENT' && (
                                                <>
                                                    <FormGroup
                                                        error={showFieldErrors(
                                                            errors.relatedToCovid19
                                                        )}
                                                    >
                                                        <Fieldset
                                                            aria-required
                                                            legend="Is this contract action related to the COVID-19 public health emergency?"
                                                        >
                                                            {showFieldErrors(
                                                                errors.relatedToCovid19
                                                            ) && (
                                                                <ErrorMessage>
                                                                    {
                                                                        errors.relatedToCovid19
                                                                    }
                                                                </ErrorMessage>
                                                            )}
                                                            <FieldRadio
                                                                id="covidYes"
                                                                name="relatedToCovid19"
                                                                label="Yes"
                                                                value="YES"
                                                                checked={
                                                                    values.relatedToCovid19 ===
                                                                    'YES'
                                                                }
                                                            />
                                                            <FieldRadio
                                                                id="covidNo"
                                                                name="relatedToCovid19"
                                                                label="No"
                                                                value="NO"
                                                                checked={
                                                                    values.relatedToCovid19 ===
                                                                    'NO'
                                                                }
                                                            />
                                                        </Fieldset>
                                                    </FormGroup>
                                                    {values.relatedToCovid19 ===
                                                        'YES' && (
                                                        <FormGroup
                                                            error={showFieldErrors(
                                                                errors.relatedToVaccination
                                                            )}
                                                        >
                                                            <Fieldset
                                                                aria-required
                                                                legend="Is this related to coverage and reimbursement for vaccine administration?"
                                                            >
                                                                {showFieldErrors(
                                                                    errors.relatedToVaccination
                                                                ) && (
                                                                    <ErrorMessage>
                                                                        {
                                                                            errors.relatedToVaccination
                                                                        }
                                                                    </ErrorMessage>
                                                                )}
                                                                <FieldRadio
                                                                    id="vaccineYes"
                                                                    name="relatedToVaccination"
                                                                    label="Yes"
                                                                    value="YES"
                                                                    checked={
                                                                        values.relatedToVaccination ===
                                                                        'YES'
                                                                    }
                                                                />
                                                                <FieldRadio
                                                                    id="vaccineNo"
                                                                    name="relatedToVaccination"
                                                                    label="No"
                                                                    value="NO"
                                                                    checked={
                                                                        values.relatedToVaccination ===
                                                                        'NO'
                                                                    }
                                                                />
                                                            </Fieldset>
                                                        </FormGroup>
                                                    )}
                                                </>
                                            )}
                                        </>
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
                                    history.push('type')
                                } else {
                                    await handleFormSubmit(
                                        values,
                                        setSubmitting,
                                        {
                                            shouldValidateDocuments: false,
                                            redirectPath: 'type',
                                        }
                                    )
                                }
                            }}
                            continueDisabled={
                                isSubmitting || showFileUploadError
                            }
                        />
                    </UswdsForm>
                </>
            )}
        </Formik>
    )
}
