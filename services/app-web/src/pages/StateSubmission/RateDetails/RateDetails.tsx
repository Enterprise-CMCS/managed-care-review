import React, { useEffect } from 'react'
import {
    Form as UswdsForm,
    FormGroup,
    Fieldset,
    Link,
    DateRangePicker,
    DatePicker,
    Label,
} from '@trussworks/react-uswds'
import { Formik, FormikErrors } from 'formik'
import { useHistory } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'

import styles from '../StateSubmissionForm.module.scss'

import {
    Document,
    DraftSubmission,
    RateType,
    UpdateDraftSubmissionInput,
} from '../../../gen/gqlClient'

import {
    FileUpload,
    S3FileData,
    FileItemT,
    ErrorSummary,
    FieldRadio,
    PoliteErrorMessage,
} from '../../../components'
import {
    formatForForm,
    isDateRangeEmpty,
    formatUserInputDate,
} from '../../../formHelpers'
import { isS3Error } from '../../../s3'
import { RateDetailsFormSchema } from './RateDetailsSchema'
import { updatesFromSubmission } from '../updateSubmissionTransform'
import { useS3 } from '../../../contexts/S3Context'
import { PageActions } from '../PageActions'
type FormError =
    FormikErrors<RateDetailsFormValues>[keyof FormikErrors<RateDetailsFormValues>]

const RateDatesErrorMessage = ({
    startDate,
    endDate,
    validationErrorMessage,
}: {
    startDate: string
    endDate: string
    validationErrorMessage: string
}): React.ReactElement => (
    <PoliteErrorMessage>
        {isDateRangeEmpty(startDate, endDate)
            ? 'You must provide a start and an end date'
            : validationErrorMessage}
    </PoliteErrorMessage>
)
export interface RateDetailsFormValues {
    rateType: RateType | undefined
    rateDateStart: string
    rateDateEnd: string
    rateDateCertified: string
    effectiveDateStart: string
    effectiveDateEnd: string
}
export const RateDetails = ({
    draftSubmission,
    showValidations = false,
    updateDraft,
}: {
    draftSubmission: DraftSubmission
    showValidations?: boolean
    updateDraft: (
        input: UpdateDraftSubmissionInput
    ) => Promise<DraftSubmission | undefined>
}): React.ReactElement => {
    const [shouldValidate, setShouldValidate] = React.useState(showValidations)
    const history = useHistory()

    // Rate documents state management
    const { deleteFile, getKey, getS3URL, scanFile, uploadFile } = useS3()
    const [fileItems, setFileItems] = React.useState<FileItemT[]>([])
    const [focusErrorSummaryHeading, setFocusErrorSummaryHeading] =
        React.useState(false)
    const errorSummaryHeadingRef = React.useRef<HTMLHeadingElement>(null)

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
        fileItems.length === 0 ? 'rateDocuments' : '#file-items-list'

    const fileItemsFromDraftSubmission: FileItemT[] | undefined =
        (draftSubmission?.rateDocuments &&
            draftSubmission?.rateDocuments.map((doc) => {
                const key = getKey(doc.s3URL)
                if (!key) {
                    // If there is no key, this means the file saved on a submission cannot be parsed or does not exist on s3.
                    // We still include the file in the list displayed to the user, but with an error. .
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
            })) ||
        undefined

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

    useEffect(() => {
        // Focus the error summary heading only if we are displaying
        // validation errors and the heading element exists
        if (focusErrorSummaryHeading && errorSummaryHeadingRef.current) {
            errorSummaryHeadingRef.current.focus()
        }
        setFocusErrorSummaryHeading(false)
    }, [focusErrorSummaryHeading])

    // Rate details form setup
    const showFieldErrors = (error?: FormError) =>
        shouldValidate && Boolean(error)

    const rateDetailsInitialValues: RateDetailsFormValues = {
        rateType: draftSubmission?.rateType ?? undefined,
        rateDateStart:
            (draftSubmission && formatForForm(draftSubmission.rateDateStart)) ??
            '',
        rateDateEnd:
            (draftSubmission && formatForForm(draftSubmission.rateDateEnd)) ??
            '',
        rateDateCertified:
            (draftSubmission &&
                formatForForm(draftSubmission.rateDateCertified)) ??
            '',
        effectiveDateStart:
            (draftSubmission &&
                formatForForm(
                    draftSubmission.rateAmendmentInfo?.effectiveDateStart
                )) ??
            '',
        effectiveDateEnd:
            (draftSubmission &&
                formatForForm(
                    draftSubmission.rateAmendmentInfo?.effectiveDateEnd
                )) ??
            '',
    }

    const isRateTypeEmpty = (values: RateDetailsFormValues): boolean =>
        values.rateType === undefined

    const isRateTypeAmendment = (values: RateDetailsFormValues): boolean =>
        values.rateType === 'AMENDMENT'

    const handleFormSubmit = async (
        values: RateDetailsFormValues,
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

        const rateDocuments = fileItems.reduce(
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
                        documentCategories: ['RATES'],
                    })
                }
                return formDataDocuments
            },
            [] as Document[]
        )

        const updatedDraft = updatesFromSubmission(draftSubmission)
        updatedDraft.rateType = values.rateType
        updatedDraft.rateDateStart = values.rateDateStart || null
        updatedDraft.rateDateEnd = values.rateDateEnd || null
        updatedDraft.rateDateCertified = values.rateDateCertified || null
        updatedDraft.rateDocuments = rateDocuments

        if (values.rateType === 'AMENDMENT') {
            updatedDraft.rateAmendmentInfo = {
                effectiveDateStart: values.effectiveDateStart,
                effectiveDateEnd: values.effectiveDateEnd,
            }
        } else {
            updatedDraft.rateAmendmentInfo = null
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
        <>
            <Formik
                initialValues={rateDetailsInitialValues}
                onSubmit={(values, { setSubmitting }) => {
                    return handleFormSubmit(values, setSubmitting, {
                        shouldValidateDocuments: true,
                        redirectPath: 'contacts',
                    })
                }}
                validationSchema={RateDetailsFormSchema}
            >
                {({
                    values,
                    errors,
                    handleSubmit,
                    isSubmitting,
                    setSubmitting,
                    setFieldValue,
                }) => (
                    <>
                        <UswdsForm
                            className={styles.formContainer}
                            id="RateDetailsForm"
                            aria-label="Rate Details Form"
                            aria-describedby="form-guidance"
                            onSubmit={(e) => {
                                setShouldValidate(true)
                                setFocusErrorSummaryHeading(true)
                                handleSubmit(e)
                            }}
                        >
                            <fieldset className="usa-fieldset">
                                <legend className="srOnly">Rate Details</legend>
                                <span id="form-guidance">
                                    All fields are required
                                </span>

                                <FormGroup error={showFileUploadError}>
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
                                    <FileUpload
                                        id="rateDocuments"
                                        name="rateDocuments"
                                        label="Upload rate certification"
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
                                                    CSV, DOC, DOCX, XLS, XLSX
                                                    files.
                                                </span>
                                            </>
                                        }
                                        accept="application/pdf,text/csv,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                                        initialItems={
                                            fileItemsFromDraftSubmission
                                        }
                                        uploadFile={handleUploadFile}
                                        scanFile={handleScanFile}
                                        deleteFile={handleDeleteFile}
                                        onFileItemsUpdate={onFileItemsUpdate}
                                    />
                                </FormGroup>
                                <FormGroup
                                    error={showFieldErrors(errors.rateType)}
                                >
                                    <Fieldset
                                        className={styles.radioGroup}
                                        legend="Rate certification type"
                                        role="radiogroup"
                                        aria-required
                                    >
                                        {showFieldErrors(errors.rateType) && (
                                            <PoliteErrorMessage>
                                                {errors.rateType}
                                            </PoliteErrorMessage>
                                        )}
                                        <Link
                                            aria-label="Rate certification type defintions (opens in new window)"
                                            href={'/help#rate-cert-type-definitions'}
                                            variant="external"
                                            target="_blank"
                                        >
                                            Rate certification type definitions
                                        </Link>
                                        <FieldRadio
                                            id="newRate"
                                            name="rateType"
                                            label="New rate certification"
                                            value={'NEW'}
                                            checked={values.rateType === 'NEW'}
                                        />
                                        <FieldRadio
                                            id="amendmentRate"
                                            name="rateType"
                                            label="Amendment to prior rate certification"
                                            value={'AMENDMENT'}
                                            checked={
                                                values.rateType === 'AMENDMENT'
                                            }
                                        />
                                    </Fieldset>
                                </FormGroup>

                                {!isRateTypeEmpty(values) && (
                                    <>
                                        <FormGroup
                                            error={
                                                showFieldErrors(
                                                    errors.rateDateStart
                                                ) ||
                                                showFieldErrors(
                                                    errors.rateDateEnd
                                                )
                                            }
                                        >
                                            <Fieldset
                                                aria-required
                                                legend={
                                                    isRateTypeAmendment(values)
                                                        ? 'Rating period of original rate certification'
                                                        : 'Rating period'
                                                }
                                            >
                                                {showFieldErrors(
                                                    errors.rateDateStart ||
                                                        errors.rateDateEnd
                                                ) && (
                                                    <RateDatesErrorMessage
                                                        startDate={
                                                            values.rateDateStart
                                                        }
                                                        endDate={
                                                            values.rateDateEnd
                                                        }
                                                        validationErrorMessage={
                                                            errors.rateDateStart ||
                                                            errors.rateDateEnd ||
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
                                                        disabled: false,
                                                        id: 'rateDateStart',
                                                        name: 'rateDateStart',
                                                        'aria-required': true,
                                                        defaultValue:
                                                            values.rateDateStart,
                                                        onChange: (val) =>
                                                            setFieldValue(
                                                                'rateDateStart',
                                                                formatUserInputDate(
                                                                    val
                                                                )
                                                            ),
                                                    }}
                                                    endDateHint="mm/dd/yyyy"
                                                    endDateLabel="End date"
                                                    endDatePickerProps={{
                                                        disabled: false,
                                                        id: 'rateDateEnd',
                                                        name: 'rateDateEnd',
                                                        'aria-required': true,
                                                        defaultValue:
                                                            values.rateDateEnd,
                                                        onChange: (val) =>
                                                            setFieldValue(
                                                                'rateDateEnd',
                                                                formatUserInputDate(
                                                                    val
                                                                )
                                                            ),
                                                    }}
                                                />
                                            </Fieldset>
                                        </FormGroup>

                                        {isRateTypeAmendment(values) && (
                                            <>
                                                <FormGroup>
                                                    <Fieldset
                                                        aria-required
                                                        legend="Effective dates of rate amendment"
                                                    >
                                                        {showFieldErrors(
                                                            errors.effectiveDateStart ||
                                                                errors.effectiveDateEnd
                                                        ) && (
                                                            <RateDatesErrorMessage
                                                                startDate={
                                                                    values.effectiveDateStart
                                                                }
                                                                endDate={
                                                                    values.effectiveDateEnd
                                                                }
                                                                validationErrorMessage={
                                                                    errors.effectiveDateStart ||
                                                                    errors.effectiveDateEnd ||
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
                                                                disabled: false,
                                                                id: 'effectiveDateStart',
                                                                name: 'effectiveDateStart',
                                                                'aria-required':
                                                                    true,
                                                                defaultValue:
                                                                    values.effectiveDateStart,
                                                                onChange: (
                                                                    val
                                                                ) =>
                                                                    setFieldValue(
                                                                        'effectiveDateStart',
                                                                        formatUserInputDate(
                                                                            val
                                                                        )
                                                                    ),
                                                            }}
                                                            endDateHint="mm/dd/yyyy"
                                                            endDateLabel="End date"
                                                            endDatePickerProps={{
                                                                disabled: false,
                                                                id: 'effectiveDateEnd',
                                                                name: 'effectiveDateEnd',
                                                                'aria-required':
                                                                    true,
                                                                defaultValue:
                                                                    values.effectiveDateEnd,
                                                                onChange: (
                                                                    val
                                                                ) =>
                                                                    setFieldValue(
                                                                        'effectiveDateEnd',
                                                                        formatUserInputDate(
                                                                            val
                                                                        )
                                                                    ),
                                                            }}
                                                        />
                                                    </Fieldset>
                                                </FormGroup>
                                            </>
                                        )}
                                        <FormGroup
                                            error={showFieldErrors(
                                                errors.rateDateCertified
                                            )}
                                        >
                                            <Label
                                                htmlFor="rateDateCertified"
                                                id="rateDateCertifiedLabel"
                                            >
                                                {isRateTypeAmendment(values)
                                                    ? 'Date certified for rate amendment'
                                                    : 'Date certified'}
                                            </Label>
                                            <div
                                                className="usa-hint"
                                                id="rateDateCertifiedHint"
                                            >
                                                mm/dd/yyyy
                                            </div>
                                            {showFieldErrors(
                                                errors.rateDateCertified
                                            ) && (
                                                <PoliteErrorMessage>
                                                    {errors.rateDateCertified}
                                                </PoliteErrorMessage>
                                            )}
                                            <DatePicker
                                                aria-required
                                                aria-describedby="rateDateCertifiedLabel rateDateCertifiedHint"
                                                id="rateDateCertified"
                                                name="rateDateCertified"
                                                defaultValue={
                                                    values.rateDateCertified
                                                }
                                                onChange={(val) =>
                                                    setFieldValue(
                                                        'rateDateCertified',
                                                        formatUserInputDate(val)
                                                    )
                                                }
                                            />
                                        </FormGroup>
                                    </>
                                )}
                            </fieldset>
                            <PageActions
                                backOnClick={async () => {
                                    // do not need to validate or submit if no documents are uploaded
                                    if (fileItems.length === 0) {
                                        history.push('contract-details')
                                    } else {
                                        await handleFormSubmit(
                                            values,
                                            setSubmitting,
                                            {
                                                shouldValidateDocuments: false,
                                                redirectPath:
                                                    'contract-details',
                                            }
                                        )
                                    }
                                }}
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
                                        setFocusErrorSummaryHeading(true)
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
                                continueDisabled={Boolean(
                                    isSubmitting || showFileUploadError
                                )}
                            />
                        </UswdsForm>
                    </>
                )}
            </Formik>
        </>
    )
}
