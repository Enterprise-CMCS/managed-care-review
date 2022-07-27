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
import { Field, Formik, FormikErrors } from 'formik'
import { useNavigate } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'

import styles from '../StateSubmissionForm.module.scss'

import {
    SubmissionDocument,
    RateType,
    RateCapitationType,
} from '../../../common-code/healthPlanFormDataType'

import {
    FileUpload,
    S3FileData,
    FileItemT,
    ErrorSummary,
    FieldRadio,
    PoliteErrorMessage,
    ProgramSelect,
} from '../../../components'
import {
    formatForForm,
    isDateRangeEmpty,
    formatUserInputDate,
    formatFormDateForDomain,
} from '../../../formHelpers'
import { isS3Error } from '../../../s3'
import { RateDetailsFormSchema } from './RateDetailsSchema'
import { useS3 } from '../../../contexts/S3Context'
import { PageActions } from '../PageActions'
import type { HealthPlanFormPageProps } from '../StateSubmissionForm'
import { ACCEPTED_SUBMISSION_FILE_TYPES } from '../../../components/FileUpload'
import { useStatePrograms } from '../../../hooks/useStatePrograms'

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
    rateCapitationType: RateCapitationType | undefined
    rateDateStart: string
    rateDateEnd: string
    rateDateCertified: string
    effectiveDateStart: string
    effectiveDateEnd: string
    rateProgramIDs: string[]
}
export const RateDetails = ({
    draftSubmission,
    previousDocuments,
    showValidations = false,
    updateDraft,
}: HealthPlanFormPageProps): React.ReactElement => {
    const [shouldValidate, setShouldValidate] = React.useState(showValidations)
    const navigate = useNavigate()

    const statePrograms = useStatePrograms()

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
        rateCapitationType: draftSubmission?.rateCapitationType ?? undefined,
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
        rateProgramIDs: draftSubmission?.rateProgramIDs ?? [],
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
                setShouldValidate(true) // set inline field errors
                setFocusErrorSummaryHeading(true) // set errors in form-wide error summary
                setSubmitting(false) // reset formik submit
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
            [] as SubmissionDocument[]
        )

        // const updatedDraft = updatesFromSubmission(draftSubmission)
        draftSubmission.rateType = values.rateType
        draftSubmission.rateCapitationType = values.rateCapitationType
        draftSubmission.rateDateStart = formatFormDateForDomain(
            values.rateDateStart
        )
        draftSubmission.rateDateEnd = formatFormDateForDomain(
            values.rateDateEnd
        )
        draftSubmission.rateDateCertified = formatFormDateForDomain(
            values.rateDateCertified
        )
        draftSubmission.rateDocuments = rateDocuments
        draftSubmission.rateProgramIDs = values.rateProgramIDs

        if (values.rateType === 'AMENDMENT') {
            draftSubmission.rateAmendmentInfo = {
                effectiveDateStart: formatFormDateForDomain(
                    values.effectiveDateStart
                ),
                effectiveDateEnd: formatFormDateForDomain(
                    values.effectiveDateEnd
                ),
            }
        } else {
            draftSubmission.rateAmendmentInfo = undefined
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

    return (
        <>
            <Formik
                initialValues={rateDetailsInitialValues}
                onSubmit={(values, { setSubmitting }) => {
                    return handleFormSubmit(values, setSubmitting, {
                        shouldValidateDocuments: true,
                        redirectPath: `../contacts`,
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
                                                    CSV, DOC, DOCX, XLS, XLSX,
                                                    XLSM files.
                                                </span>
                                            </>
                                        }
                                        accept={ACCEPTED_SUBMISSION_FILE_TYPES}
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
                                    error={showFieldErrors(
                                        errors.rateProgramIDs
                                    )}
                                >
                                    <Label htmlFor="programIDs">
                                        Programs this rate certification covers
                                    </Label>
                                    {showFieldErrors(errors.rateProgramIDs) && (
                                        <PoliteErrorMessage>
                                            {errors.rateProgramIDs}
                                        </PoliteErrorMessage>
                                    )}
                                    <Field name="programIDs">
                                        {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
                                        {/* @ts-ignore */}
                                        {({ form }) => (
                                            <ProgramSelect
                                                statePrograms={statePrograms}
                                                programIDs={
                                                    values.rateProgramIDs
                                                }
                                                onChange={(selectedOption) =>
                                                    form.setFieldValue(
                                                        'rateProgramIDs',
                                                        selectedOption.map(
                                                            (item: {
                                                                value: string
                                                            }) => item.value
                                                        )
                                                    )
                                                }
                                            />
                                        )}
                                    </Field>
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
                                            href={
                                                '/help#rate-cert-type-definitions'
                                            }
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
                                        />
                                        <FieldRadio
                                            id="amendmentRate"
                                            name="rateType"
                                            label="Amendment to prior rate certification"
                                            value={'AMENDMENT'}
                                        />
                                    </Fieldset>
                                </FormGroup>

                                <FormGroup
                                    error={showFieldErrors(
                                        errors.rateCapitationType
                                    )}
                                >
                                    <Fieldset
                                        className={styles.radioGroup}
                                        legend={
                                            <div
                                                className={
                                                    styles.capitationLegend
                                                }
                                            >
                                                <p>
                                                    Does the actuary certify
                                                    capitation rates specific to
                                                    each rate cell or a rate
                                                    range?
                                                </p>
                                                <p
                                                    className={
                                                        styles.legendSubHeader
                                                    }
                                                >
                                                    See 42 CFR §§ 438.4(b) and
                                                    438.4(c)
                                                </p>
                                            </div>
                                        }
                                        role="radiogroup"
                                        aria-required
                                    >
                                        {showFieldErrors(
                                            errors.rateCapitationType
                                        ) && (
                                            <PoliteErrorMessage>
                                                {errors.rateCapitationType}
                                            </PoliteErrorMessage>
                                        )}
                                        <FieldRadio
                                            id="rateCell"
                                            name="rateCapitationType"
                                            label="Certification of capitation rates specific to each rate cell"
                                            value={'RATE_CELL'}
                                        />
                                        <FieldRadio
                                            id="rateRange"
                                            name="rateCapitationType"
                                            label="Certification of rate ranges of capitation rates per rate cell"
                                            value={'RATE_RANGE'}
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
                                        navigate('../contract-details')
                                    } else {
                                        await handleFormSubmit(
                                            values,
                                            setSubmitting,
                                            {
                                                shouldValidateDocuments: false,
                                                redirectPath: `../contract-details`,
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
                                disableContinue={showFileUploadError}
                                actionInProgress={isSubmitting}
                            />
                        </UswdsForm>
                    </>
                )}
            </Formik>
        </>
    )
}
