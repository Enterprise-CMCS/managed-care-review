import React from 'react'
import {
    Alert,
    ErrorMessage,
    Form as UswdsForm,
    FormGroup,
    Fieldset,
    Button,
    Link,
    DateRangePicker,
    DatePicker,
    ButtonGroup,
    Label,
} from '@trussworks/react-uswds'
import { Formik, FormikErrors } from 'formik'
import { useHistory } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'

import styles from '../StateSubmissionForm.module.scss'

import {
    DraftSubmission,
    RateType,
    UpdateDraftSubmissionInput,
} from '../../../gen/gqlClient'

import { FieldRadio } from '../../../components/Form'
import {
    FileUpload,
    S3FileData,
    FileItemT,
} from '../../../components/FileUpload'
import {
    formatForForm,
    isDateRangeEmpty,
    formatUserInputDate,
} from '../../../formHelpers'
import { isS3Error } from '../../../s3'
import { MCRouterState } from '../../../constants/routerState'
import { RateDetailsFormSchema } from './schema'
import { updatesFromSubmission } from '../updateSubmissionTransform'
import { useS3 } from '../../../contexts/S3Context'
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
    <ErrorMessage>
        {isDateRangeEmpty(startDate, endDate)
            ? 'You must provide a start and an end date'
            : validationErrorMessage}
    </ErrorMessage>
)

const PageLevelErrorAlert = ({
    hasNoDocuments,
}: {
    hasNoDocuments: boolean
}): JSX.Element =>
    hasNoDocuments ? (
        <Alert
            type="error"
            heading="Missing documents"
            className="margin-bottom-2"
        >
            You must upload at least one document
        </Alert>
    ) : (
        <Alert
            type="error"
            heading="Remove files with errors"
            className="margin-bottom-2"
        >
            You must remove all documents with error messages before continuing
        </Alert>
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
    formAlert = undefined,
}: {
    draftSubmission: DraftSubmission
    showValidations?: boolean
    formAlert?: React.ReactElement
    updateDraft: (
        input: UpdateDraftSubmissionInput
    ) => Promise<DraftSubmission | undefined>
}): React.ReactElement => {
    const [shouldValidate, setShouldValidate] = React.useState(showValidations)
    const redirectToDashboard = React.useRef(false)
    const history = useHistory<MCRouterState>()

    // Rate documents state management
    const { deleteFile, getKey, getS3URL, scanFile, uploadFile } = useS3()
    const [hasValidFiles, setHasValidFiles] = React.useState(false)
    const [hasPendingFiles, setHasPendingFiles] = React.useState(false)
    const [fileItems, setFileItems] = React.useState<FileItemT[]>([])
    const fileItemsFromDraftSubmission: FileItemT[] | undefined =
        (draftSubmission?.rateDocuments &&
            draftSubmission?.rateDocuments.map((doc) => {
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
            })) ||
        undefined

    React.useEffect(() => {
        const somePending: boolean = fileItems.some(
            (item) => item.status === 'PENDING'
        )
        setHasPendingFiles(somePending)

        const hasValidDocumentsForSubmission: boolean =
            fileItems.length > 0 &&
            !somePending &&
            fileItems.every((item) => item.status === 'UPLOAD_COMPLETE')
        setHasValidFiles(hasValidDocumentsForSubmission)
    }, [fileItems])

    const onLoadComplete = async ({ files }: { files: FileItemT[] }) => {
        setFileItems(files)
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
            shouldValidate: boolean
            redirectPath: string
        }
    ) => {
        // if there are any errors present in the documents and we are in a validation state (relevant for Save as Draft and Continue buttons), stop here.
        // Force user to clear validations to continue
        if (options.shouldValidate) {
            setShouldValidate(true)
            if (!hasValidFiles) return
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
                    })
                }
                return formDataDocuments
            },
            [] as { name: string; s3URL: string }[]
        )

        const updatedDraft = updatesFromSubmission(draftSubmission)
        updatedDraft.rateType = values.rateType
        updatedDraft.rateDateStart = values.rateDateStart
        updatedDraft.rateDateEnd = values.rateDateEnd
        updatedDraft.rateDateCertified = values.rateDateCertified
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
                history.push(options.redirectPath, {
                    defaultProgramID: draftSubmission.programID,
                })
            }
        } catch (serverError) {
            setSubmitting(false)
            redirectToDashboard.current = false
        }
    }

    return (
        <>
            <Formik
                initialValues={rateDetailsInitialValues}
                onSubmit={(values, { setSubmitting }) => {
                    return handleFormSubmit(values, setSubmitting, {
                        shouldValidate: true,
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
                            onSubmit={(e) => {
                                setShouldValidate(true)
                                handleSubmit(e)
                            }}
                        >
                            <fieldset className="usa-fieldset">
                                <legend className="srOnly">Rate Details</legend>
                                {shouldValidate && !hasValidFiles && (
                                    <PageLevelErrorAlert
                                        hasNoDocuments={fileItems.length === 0}
                                    />
                                )}
                                {formAlert && formAlert}
                                <span>All fields are required</span>
                                <FileUpload
                                    id="rateDocuments"
                                    name="rateDocuments"
                                    label="Upload rate certification"
                                    hint={
                                        <Link
                                            aria-label="Document definitions and requirements (opens in new window)"
                                            href={
                                                'https://www.medicaid.gov/federal-policy-guidance/downloads/cib110819.pdf'
                                            }
                                            variant="external"
                                            target="_blank"
                                        >
                                            Document definitions and
                                            requirements
                                        </Link>
                                    }
                                    accept="application/pdf,text/csv,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                                    initialItems={fileItemsFromDraftSubmission}
                                    uploadFile={handleUploadFile}
                                    scanFile={handleScanFile}
                                    deleteFile={handleDeleteFile}
                                    onLoadComplete={onLoadComplete}
                                />
                                <FormGroup
                                    error={showFieldErrors(errors.rateType)}
                                >
                                    <Fieldset
                                        className={styles.radioGroup}
                                        legend="Rate certification type"
                                    >
                                        {showFieldErrors(errors.rateType) && (
                                            <ErrorMessage>
                                                {errors.rateType}
                                            </ErrorMessage>
                                        )}
                                        <FieldRadio
                                            id="newRate"
                                            name="rateType"
                                            label="New rate certification"
                                            value={'NEW'}
                                            checked={values.rateType === 'NEW'}
                                            aria-required
                                        />
                                        <FieldRadio
                                            id="amendmentRate"
                                            name="rateType"
                                            label="Amendment to prior rate certification"
                                            value={'AMENDMENT'}
                                            checked={
                                                values.rateType === 'AMENDMENT'
                                            }
                                            aria-required
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
                                                    <Fieldset legend="Effective dates of rate amendment">
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
                                                <ErrorMessage>
                                                    {errors.rateDateCertified}
                                                </ErrorMessage>
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
                            <div className={styles.pageActions}>
                                <Button
                                    type="button"
                                    unstyled
                                    onClick={async () => {
                                        // do not need to trigger validations if file list is empty
                                        if (fileItems.length === 0) {
                                            await handleFormSubmit(
                                                values,
                                                setSubmitting,
                                                {
                                                    shouldValidate: false,
                                                    redirectPath: '/dashboard',
                                                }
                                            )
                                        } else {
                                            await handleFormSubmit(
                                                values,
                                                setSubmitting,
                                                {
                                                    shouldValidate: true,
                                                    redirectPath: '/dashboard',
                                                }
                                            )
                                        }
                                    }}
                                >
                                    Save as draft
                                </Button>
                                <ButtonGroup
                                    type="default"
                                    className={styles.buttonGroup}
                                >
                                    <Button
                                        type="button"
                                        className="usa-button usa-button--outline"
                                        onClick={async (e) =>
                                            handleFormSubmit(
                                                values,
                                                setSubmitting,
                                                {
                                                    shouldValidate: false,
                                                    redirectPath:
                                                        '/contact-details',
                                                }
                                            )
                                        }
                                    >
                                        Back
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={
                                            isSubmitting ||
                                            hasPendingFiles ||
                                            (shouldValidate && !hasValidFiles)
                                        }
                                    >
                                        Continue
                                    </Button>
                                </ButtonGroup>
                            </div>
                        </UswdsForm>
                    </>
                )}
            </Formik>
        </>
    )
}
