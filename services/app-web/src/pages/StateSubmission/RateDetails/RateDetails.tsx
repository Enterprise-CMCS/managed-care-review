import React, { useEffect } from 'react'
import {
    Form as UswdsForm,
    FormGroup,
    Fieldset,
    Link,
    DateRangePicker,
    DatePicker,
    Label,
    Button,
} from '@trussworks/react-uswds'
import { Field, FieldArray, Formik, FormikErrors, getIn } from 'formik'
import { useNavigate } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'

import styles from '../StateSubmissionForm.module.scss'

import {
    SubmissionDocument,
    RateType,
    RateCapitationType,
    RateInfoType,
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
import { useLDClient } from 'launchdarkly-react-client-sdk'
import { featureFlags } from '../../../common-code/featureFlags'
import * as Yup from 'yup'
import { useFocus } from '../../../hooks'

/**
 * TODO: Still needs done
 * ✓ Add rateInfo to toDomain and update types
 * ✓ Pass rateInfo  from StateSubmissionForm to child components
 * ✓ Update rate yup schema to handle array of rate details
 * ✓ Update functions to handle multi-rate initial data for Formik to render multi-rates
 * ✓ Implement add and remove new rates
 * ✓ Fix form errors and focus links
 * ✓ Update submit to handle multi-rates, minus files
 * ✓ Modify file upload for multi-rate
 * ✓ Update submit to handle multi-rate files
 * ✓ Focusing on newly added rate certification
 * ✓ Keeping docs associated with the correct rate when a rate is removed
 * ✓ Fix document error messages.
 * ✓ toProtobuf for rateInfo
 * ✓ Rename stuff
 * ☐ Accessibility Testing
 * ☐ Update unit and end to end tests
 * ☐ Final cleanup
 */

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

interface RateInfoArrayType {
    rateInfos: RateInfoFormType[]
}

export interface RateInfoFormType {
    uuid: string
    rateType: RateType | undefined
    rateCapitationType: RateCapitationType | undefined
    rateDateStart: string
    rateDateEnd: string
    rateDateCertified: string
    effectiveDateStart: string
    effectiveDateEnd: string
    rateProgramIDs: string[]
    rateDocuments: SubmissionDocument[]
}

type FormError =
    FormikErrors<RateInfoFormType>[keyof FormikErrors<RateInfoFormType>]

const rateErrorHandling = (
    error: string | FormikErrors<RateInfoFormType> | undefined
): FormikErrors<RateInfoFormType> | undefined => {
    if (typeof error === 'string') {
        return undefined
    }
    return error
}

export const RateDetails = ({
    draftSubmission,
    previousDocuments,
    showValidations = false,
    updateDraft,
}: HealthPlanFormPageProps): React.ReactElement => {
    const { deleteFile, getKey, getS3URL, scanFile, uploadFile } = useS3()
    const navigate = useNavigate()
    const statePrograms = useStatePrograms()

    // Launch Darkly
    const ldClient = useLDClient()
    const showMultiRates = ldClient?.variation(
        featureFlags.MULTI_RATE_SUBMISSIONS.flag,
        featureFlags.MULTI_RATE_SUBMISSIONS.defaultValue
    )

    // Rate documents state management
    const [focusErrorSummaryHeading, setFocusErrorSummaryHeading] =
        React.useState(false)
    const errorSummaryHeadingRef = React.useRef<HTMLHeadingElement>(null)
    const [shouldValidate, setShouldValidate] = React.useState(showValidations)
    const [focusNewRate, setFocusNewRate] = React.useState(false)
    const newRateNameRef = React.useRef<HTMLElement | null>(null)
    const [newRateButtonRef, setNewRateButtonFocus] = useFocus() // This ref.current is always the same element

    const rateDetailsFormSchema = Yup.object().shape({
        rateInfos: Yup.array().of(RateDetailsFormSchema),
    })

    const fileItemsFromRateInfo = (rateInfo: RateInfoFormType): FileItemT[] => {
        return (
            (rateInfo?.rateDocuments &&
                rateInfo?.rateDocuments.map((doc) => {
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
            []
        )
    }

    const rateInfoFormValues = (rateInfo?: RateInfoType): RateInfoFormType => ({
        //UUID is needed here as a unique component key prop to track mapped rateInfo in Formik Field array. This ensures we remove the correct FileUpload component when removing a rate.
        uuid: uuidv4(),
        rateType: rateInfo?.rateType ?? undefined,
        rateCapitationType: rateInfo?.rateCapitationType ?? undefined,
        rateDateStart:
            (rateInfo && formatForForm(rateInfo.rateDateStart)) ?? '',
        rateDateEnd: (rateInfo && formatForForm(rateInfo.rateDateEnd)) ?? '',
        rateDateCertified:
            (rateInfo && formatForForm(rateInfo.rateDateCertified)) ?? '',
        effectiveDateStart:
            (rateInfo &&
                formatForForm(
                    rateInfo.rateAmendmentInfo?.effectiveDateStart
                )) ??
            '',
        effectiveDateEnd:
            (rateInfo &&
                formatForForm(rateInfo.rateAmendmentInfo?.effectiveDateEnd)) ??
            '',
        rateProgramIDs: rateInfo?.rateProgramIDs ?? [],
        rateDocuments: rateInfo?.rateDocuments ?? [],
    })

    const getDocumentsError = (
        fileItems: FileItemT[],
        index: number
    ): { key: string; error: string } | undefined => {
        const hasValidFiles =
            fileItems.length > 0 &&
            fileItems.every((fileItem) => fileItem.status === 'UPLOAD_COMPLETE')
        const hasLoadingFiles =
            fileItems.some((fileItem) => fileItem.status === 'PENDING') ||
            fileItems.some((fileItem) => fileItem.status === 'SCANNING')

        const documentsErrorMessage = hasLoadingFiles
            ? 'You must wait for all documents to finish uploading before continuing'
            : fileItems.length === 0
            ? 'You must upload at least one document'
            : !hasValidFiles
            ? 'You must remove all documents with error messages before continuing'
            : undefined

        if (documentsErrorMessage) {
            return {
                key: `rateInfos.${index}.rateDocuments`,
                error: documentsErrorMessage,
            }
        }
        return undefined
    }

    const initialFileItemsMatrix: FileItemT[][] = draftSubmission.rateInfos.map(
        (rateInfo) => fileItemsFromRateInfo(rateInfoFormValues(rateInfo))
    )

    const [fileItemsMatrix, setFileItemsMatrix] = React.useState<FileItemT[][]>(
        initialFileItemsMatrix
    )

    const allRatesHasValidFiles =
        fileItemsMatrix.every((fileItems) => fileItems.length > 0) &&
        fileItemsMatrix
            .flat()
            .every((fileItems) => fileItems.status === 'UPLOAD_COMPLETE')

    const showFileUploadError = shouldValidate && !allRatesHasValidFiles

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

    React.useEffect(() => {
        if (focusNewRate) {
            newRateNameRef.current && newRateNameRef.current.focus()
            setFocusNewRate(false)
            newRateNameRef.current = null
        }
    }, [focusNewRate])

    useEffect(() => {
        // Focus the error summary heading only if we are displaying
        // validation errors and the heading element exists
        if (focusErrorSummaryHeading && errorSummaryHeadingRef.current) {
            errorSummaryHeadingRef.current.focus()
        }
        setFocusErrorSummaryHeading(false)
    }, [focusErrorSummaryHeading])

    const showFieldErrors = (error?: FormError) =>
        shouldValidate && Boolean(error)

    //Return only the first-rate info if multi-rate submission feature flag is off
    const rateInfosInitialValues: RateInfoArrayType = showMultiRates
        ? {
              rateInfos:
                  draftSubmission.rateInfos.length > 0
                      ? draftSubmission.rateInfos.map((rateInfo) =>
                            rateInfoFormValues(rateInfo)
                        )
                      : [rateInfoFormValues()],
          }
        : {
              rateInfos: [rateInfoFormValues(draftSubmission.rateInfos[0])],
          }

    const processFileItems = (fileItems: FileItemT[]): SubmissionDocument[] => {
        return fileItems.reduce((formDataDocuments, fileItem) => {
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
        }, [] as SubmissionDocument[])
    }

    const isRateTypeEmpty = (values: RateInfoFormType): boolean =>
        values.rateType === undefined

    const isRateTypeAmendment = (values: RateInfoFormType): boolean =>
        values.rateType === 'AMENDMENT'

    const handleFormSubmit = async (
        rateInfos: RateInfoFormType[],
        setSubmitting: (isSubmitting: boolean) => void, // formik setSubmitting
        options: {
            shouldValidateDocuments: boolean
            redirectPath: string
        }
    ) => {
        // Currently documents validation happens (outside of the yup schema, which only handles the formik form data)
        // if there are any errors present in the documents list and we are in a validation state (relevant for Save as Draft) force user to clear validations to continue
        if (options.shouldValidateDocuments) {
            if (!allRatesHasValidFiles) {
                setShouldValidate(true) // set inline field errors
                setFocusErrorSummaryHeading(true) // set errors in form-wide error summary
                setSubmitting(false) // reset formik submit
                return
            }
        }

        draftSubmission.rateInfos = rateInfos.map((rateInfo, index) => {
            return {
                rateType: rateInfo.rateType,
                rateCapitationType: rateInfo.rateCapitationType,
                rateDocuments: processFileItems(fileItemsMatrix[index]),
                rateDateStart: formatFormDateForDomain(rateInfo.rateDateStart),
                rateDateEnd: formatFormDateForDomain(rateInfo.rateDateEnd),
                rateDateCertified: formatFormDateForDomain(
                    rateInfo.rateDateCertified
                ),
                rateAmendmentInfo:
                    rateInfo.rateType === 'AMENDMENT'
                        ? {
                              effectiveDateStart: formatFormDateForDomain(
                                  rateInfo.effectiveDateStart
                              ),
                              effectiveDateEnd: formatFormDateForDomain(
                                  rateInfo.effectiveDateEnd
                              ),
                          }
                        : undefined,
                rateProgramIDs: rateInfo.rateProgramIDs,
            }
        })

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

    const generateErrorSummaryErrors = (
        errors: FormikErrors<RateInfoArrayType>
    ) => {
        const rateErrors = errors.rateInfos
        const errorObject: { [field: string]: string } = {}
        const documentErrors: { [field: string]: string }[] = []
        fileItemsMatrix.forEach((fileItems, index) => {
            const error = getDocumentsError(fileItems, index)
            if (error?.key && error?.error) {
                documentErrors.push({
                    [error.key]: error.error,
                })
            }
        })

        if (documentErrors) {
            Object.assign(errorObject, ...documentErrors)
        }

        if (rateErrors && Array.isArray(rateErrors)) {
            rateErrors.forEach((rateError, index) => {
                if (!rateError) return
                Object.entries(rateError).forEach(([field, value]) => {
                    if (typeof value === 'string') {
                        //rateProgramIDs error message needs a # proceeding the key name because this is the only way to be able to link to the ProgramSelect component element see comments in ErrorSummaryMessage component.
                        const errorKey =
                            field === 'rateProgramIDs'
                                ? `#rateInfos.${index}.${field}`
                                : `rateInfos.${index}.${field}`
                        errorObject[errorKey] = value
                    }
                })
            })
        }

        return errorObject
    }

    return (
        <Formik
            initialValues={rateInfosInitialValues}
            onSubmit={(values, { setSubmitting }) => {
                return handleFormSubmit(values.rateInfos, setSubmitting, {
                    shouldValidateDocuments: true,
                    redirectPath: `../contacts`,
                })
            }}
            validationSchema={rateDetailsFormSchema}
        >
            {({
                values: { rateInfos },
                errors,
                handleSubmit,
                isSubmitting,
                setSubmitting,
                setFieldValue,
            }) => {
                return (
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

                                {shouldValidate && (
                                    <ErrorSummary
                                        errors={generateErrorSummaryErrors(
                                            errors
                                        )}
                                        headingRef={errorSummaryHeadingRef}
                                    />
                                )}
                                <FieldArray name="rateInfos">
                                    {({ remove, push }) => (
                                        <>
                                            {rateInfos.map(
                                                (rateInfo, index, arr) => (
                                                    <div key={rateInfo.uuid}>
                                                        <FormGroup
                                                            error={
                                                                showFileUploadError
                                                            }
                                                        >
                                                            <FileUpload
                                                                id={`rateInfos.${index}.rateDocuments`}
                                                                name={`rateInfos.${index}.rateDocuments`}
                                                                label="Upload rate certification"
                                                                renderMode="list"
                                                                aria-required
                                                                error={
                                                                    (showFileUploadError &&
                                                                        getDocumentsError(
                                                                            fileItemsMatrix[
                                                                                index
                                                                            ],
                                                                            index
                                                                        )
                                                                            ?.error) ||
                                                                    undefined
                                                                }
                                                                hint={
                                                                    <>
                                                                        <Link
                                                                            aria-label="Document definitions and requirements (opens in new window)"
                                                                            href={
                                                                                '/help#key-documents'
                                                                            }
                                                                            variant="external"
                                                                            target="_blank"
                                                                        >
                                                                            Document
                                                                            definitions
                                                                            and
                                                                            requirements
                                                                        </Link>
                                                                        <span>
                                                                            This
                                                                            input
                                                                            only
                                                                            accepts
                                                                            PDF,
                                                                            CSV,
                                                                            DOC,
                                                                            DOCX,
                                                                            XLS,
                                                                            XLSX,
                                                                            XLSM
                                                                            files.
                                                                        </span>
                                                                    </>
                                                                }
                                                                accept={
                                                                    ACCEPTED_SUBMISSION_FILE_TYPES
                                                                }
                                                                initialItems={
                                                                    fileItemsMatrix[
                                                                        index
                                                                    ]
                                                                }
                                                                uploadFile={
                                                                    handleUploadFile
                                                                }
                                                                scanFile={
                                                                    handleScanFile
                                                                }
                                                                deleteFile={
                                                                    handleDeleteFile
                                                                }
                                                                onFileItemsUpdate={({
                                                                    fileItems,
                                                                }) =>
                                                                    setFileItemsMatrix(
                                                                        (
                                                                            data
                                                                        ) => {
                                                                            data.splice(
                                                                                index,
                                                                                1,
                                                                                fileItems
                                                                            )
                                                                            return data
                                                                        }
                                                                    )
                                                                }
                                                                innerInputRef={(
                                                                    el
                                                                ) =>
                                                                    (newRateNameRef.current =
                                                                        el)
                                                                }
                                                            />
                                                        </FormGroup>
                                                        <FormGroup
                                                            error={showFieldErrors(
                                                                rateErrorHandling(
                                                                    errors
                                                                        ?.rateInfos?.[
                                                                        index
                                                                    ]
                                                                )
                                                                    ?.rateProgramIDs
                                                            )}
                                                        >
                                                            <Label
                                                                htmlFor={`rateInfos.${index}.rateProgramIDs`}
                                                            >
                                                                Programs this
                                                                rate
                                                                certification
                                                                covers
                                                            </Label>
                                                            {showFieldErrors(
                                                                rateErrorHandling(
                                                                    errors
                                                                        ?.rateInfos?.[
                                                                        index
                                                                    ]
                                                                )
                                                                    ?.rateProgramIDs
                                                            ) && (
                                                                <PoliteErrorMessage>
                                                                    {getIn(
                                                                        errors,
                                                                        `rateInfos.${index}.rateProgramIDs`
                                                                    )}
                                                                </PoliteErrorMessage>
                                                            )}
                                                            <Field
                                                                name={`rateInfos.${index}.rateProgramIDs`}
                                                            >
                                                                {({
                                                                    /* eslint-disable-next-line @typescript-eslint/ban-ts-comment */
                                                                    /* @ts-ignore */
                                                                    form,
                                                                }) => (
                                                                    <ProgramSelect
                                                                        name={`rateInfos.${index}.rateProgramIDs`}
                                                                        inputId={`rateInfos.${index}.rateProgramIDs`}
                                                                        statePrograms={
                                                                            statePrograms
                                                                        }
                                                                        programIDs={
                                                                            rateInfo.rateProgramIDs
                                                                        }
                                                                        aria-label="programs (required)"
                                                                        onChange={(
                                                                            selectedOption
                                                                        ) =>
                                                                            form.setFieldValue(
                                                                                `rateInfos.${index}.rateProgramIDs`,
                                                                                selectedOption.map(
                                                                                    (item: {
                                                                                        value: string
                                                                                    }) =>
                                                                                        item.value
                                                                                )
                                                                            )
                                                                        }
                                                                    />
                                                                )}
                                                            </Field>
                                                        </FormGroup>
                                                        <FormGroup
                                                            error={showFieldErrors(
                                                                rateErrorHandling(
                                                                    errors
                                                                        ?.rateInfos?.[
                                                                        index
                                                                    ]
                                                                )?.rateType
                                                            )}
                                                        >
                                                            <Fieldset
                                                                className={
                                                                    styles.radioGroup
                                                                }
                                                                legend="Rate certification type"
                                                                role="radiogroup"
                                                                aria-required
                                                            >
                                                                {showFieldErrors(
                                                                    rateErrorHandling(
                                                                        errors
                                                                            ?.rateInfos?.[
                                                                            index
                                                                        ]
                                                                    )?.rateType
                                                                ) && (
                                                                    <PoliteErrorMessage>
                                                                        {getIn(
                                                                            errors,
                                                                            `rateInfos.${index}.rateType`
                                                                        )}
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
                                                                    Rate
                                                                    certification
                                                                    type
                                                                    definitions
                                                                </Link>
                                                                <FieldRadio
                                                                    id={`newRate-${index}`}
                                                                    name={`rateInfos.${index}.rateType`}
                                                                    label="New rate certification"
                                                                    value={
                                                                        'NEW'
                                                                    }
                                                                />
                                                                <FieldRadio
                                                                    id={`amendmentRate-${index}`}
                                                                    name={`rateInfos.${index}.rateType`}
                                                                    label="Amendment to prior rate certification"
                                                                    value={
                                                                        'AMENDMENT'
                                                                    }
                                                                />
                                                            </Fieldset>
                                                        </FormGroup>

                                                        <FormGroup
                                                            error={showFieldErrors(
                                                                rateErrorHandling(
                                                                    errors
                                                                        ?.rateInfos?.[
                                                                        index
                                                                    ]
                                                                )
                                                                    ?.rateCapitationType
                                                            )}
                                                        >
                                                            <Fieldset
                                                                className={
                                                                    styles.radioGroup
                                                                }
                                                                legend={
                                                                    <div
                                                                        className={
                                                                            styles.capitationLegend
                                                                        }
                                                                    >
                                                                        <p>
                                                                            Does
                                                                            the
                                                                            actuary
                                                                            certify
                                                                            capitation
                                                                            rates
                                                                            specific
                                                                            to
                                                                            each
                                                                            rate
                                                                            cell
                                                                            or a
                                                                            rate
                                                                            range?
                                                                        </p>
                                                                        <p
                                                                            className={
                                                                                styles.legendSubHeader
                                                                            }
                                                                        >
                                                                            See
                                                                            42
                                                                            CFR
                                                                            §§
                                                                            438.4(b)
                                                                            and
                                                                            438.4(c)
                                                                        </p>
                                                                    </div>
                                                                }
                                                                role="radiogroup"
                                                                aria-required
                                                            >
                                                                {showFieldErrors(
                                                                    rateErrorHandling(
                                                                        errors
                                                                            ?.rateInfos?.[
                                                                            index
                                                                        ]
                                                                    )
                                                                        ?.rateCapitationType
                                                                ) && (
                                                                    <PoliteErrorMessage>
                                                                        {getIn(
                                                                            errors,
                                                                            `rateInfos.${index}.rateCapitationType`
                                                                        )}
                                                                    </PoliteErrorMessage>
                                                                )}
                                                                <FieldRadio
                                                                    id={`rateCell-${index}`}
                                                                    name={`rateInfos.${index}.rateCapitationType`}
                                                                    label="Certification of capitation rates specific to each rate cell"
                                                                    value={
                                                                        'RATE_CELL'
                                                                    }
                                                                />
                                                                <FieldRadio
                                                                    id={`rateRange-${index}`}
                                                                    name={`rateInfos.${index}.rateCapitationType`}
                                                                    label="Certification of rate ranges of capitation rates per rate cell"
                                                                    value={
                                                                        'RATE_RANGE'
                                                                    }
                                                                />
                                                            </Fieldset>
                                                        </FormGroup>

                                                        {!isRateTypeEmpty(
                                                            rateInfo
                                                        ) && (
                                                            <>
                                                                <FormGroup
                                                                    error={
                                                                        showFieldErrors(
                                                                            rateErrorHandling(
                                                                                errors
                                                                                    ?.rateInfos?.[
                                                                                    index
                                                                                ]
                                                                            )
                                                                                ?.rateDateStart
                                                                        ) ||
                                                                        showFieldErrors(
                                                                            rateErrorHandling(
                                                                                errors
                                                                                    ?.rateInfos?.[
                                                                                    index
                                                                                ]
                                                                            )
                                                                                ?.rateDateEnd
                                                                        )
                                                                    }
                                                                >
                                                                    <Fieldset
                                                                        aria-required
                                                                        legend={
                                                                            isRateTypeAmendment(
                                                                                rateInfo
                                                                            )
                                                                                ? 'Rating period of original rate certification'
                                                                                : 'Rating period'
                                                                        }
                                                                    >
                                                                        {showFieldErrors(
                                                                            rateErrorHandling(
                                                                                errors
                                                                                    ?.rateInfos?.[
                                                                                    index
                                                                                ]
                                                                            )
                                                                                ?.rateDateStart ||
                                                                                rateErrorHandling(
                                                                                    errors
                                                                                        ?.rateInfos?.[
                                                                                        index
                                                                                    ]
                                                                                )
                                                                                    ?.rateDateEnd
                                                                        ) && (
                                                                            <RateDatesErrorMessage
                                                                                startDate={
                                                                                    rateInfo.rateDateStart
                                                                                }
                                                                                endDate={
                                                                                    rateInfo.rateDateEnd
                                                                                }
                                                                                validationErrorMessage={
                                                                                    getIn(
                                                                                        errors,
                                                                                        `rateInfos.${index}.rateDateStart`
                                                                                    ) ||
                                                                                    getIn(
                                                                                        errors,
                                                                                        `rateInfos.${index}.rateDateEnd`
                                                                                    ) ||
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
                                                                                disabled:
                                                                                    false,
                                                                                id: `rateInfos.${index}.rateDateStart`,
                                                                                name: `rateInfos.${index}.rateDateStart`,
                                                                                'aria-required':
                                                                                    true,
                                                                                defaultValue:
                                                                                    rateInfo.rateDateStart,
                                                                                onChange:
                                                                                    (
                                                                                        val
                                                                                    ) =>
                                                                                        setFieldValue(
                                                                                            `rateInfos.${index}.rateDateStart`,
                                                                                            formatUserInputDate(
                                                                                                val
                                                                                            )
                                                                                        ),
                                                                            }}
                                                                            endDateHint="mm/dd/yyyy"
                                                                            endDateLabel="End date"
                                                                            endDatePickerProps={{
                                                                                disabled:
                                                                                    false,
                                                                                id: `rateInfos.${index}.rateDateEnd`,
                                                                                name: `rateInfos.${index}.rateDateEnd`,
                                                                                'aria-required':
                                                                                    true,
                                                                                defaultValue:
                                                                                    rateInfo.rateDateEnd,
                                                                                onChange:
                                                                                    (
                                                                                        val
                                                                                    ) =>
                                                                                        setFieldValue(
                                                                                            `rateInfos.${index}.rateDateEnd`,
                                                                                            formatUserInputDate(
                                                                                                val
                                                                                            )
                                                                                        ),
                                                                            }}
                                                                        />
                                                                    </Fieldset>
                                                                </FormGroup>

                                                                {isRateTypeAmendment(
                                                                    rateInfo
                                                                ) && (
                                                                    <>
                                                                        <FormGroup
                                                                            error={
                                                                                showFieldErrors(
                                                                                    rateErrorHandling(
                                                                                        errors
                                                                                            ?.rateInfos?.[
                                                                                            index
                                                                                        ]
                                                                                    )
                                                                                        ?.effectiveDateStart
                                                                                ) ||
                                                                                showFieldErrors(
                                                                                    rateErrorHandling(
                                                                                        errors
                                                                                            ?.rateInfos?.[
                                                                                            index
                                                                                        ]
                                                                                    )
                                                                                        ?.effectiveDateEnd
                                                                                )
                                                                            }
                                                                        >
                                                                            <Fieldset
                                                                                aria-required
                                                                                legend="Effective dates of rate amendment"
                                                                            >
                                                                                {showFieldErrors(
                                                                                    rateErrorHandling(
                                                                                        errors
                                                                                            ?.rateInfos?.[
                                                                                            index
                                                                                        ]
                                                                                    )
                                                                                        ?.effectiveDateStart ||
                                                                                        rateErrorHandling(
                                                                                            errors
                                                                                                ?.rateInfos?.[
                                                                                                index
                                                                                            ]
                                                                                        )
                                                                                            ?.effectiveDateEnd
                                                                                ) && (
                                                                                    <RateDatesErrorMessage
                                                                                        startDate={
                                                                                            rateInfo.effectiveDateStart
                                                                                        }
                                                                                        endDate={
                                                                                            rateInfo.effectiveDateEnd
                                                                                        }
                                                                                        validationErrorMessage={
                                                                                            getIn(
                                                                                                errors,
                                                                                                `rateInfos.${index}.effectiveDateStart`
                                                                                            ) ||
                                                                                            getIn(
                                                                                                errors,
                                                                                                `rateInfos.${index}.effectiveDateEnd`
                                                                                            ) ||
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
                                                                                        disabled:
                                                                                            false,
                                                                                        id: `rateInfos.${index}.effectiveDateStart`,
                                                                                        name: `rateInfos.${index}.effectiveDateStart`,
                                                                                        'aria-required':
                                                                                            true,
                                                                                        defaultValue:
                                                                                            rateInfo.effectiveDateStart,
                                                                                        onChange:
                                                                                            (
                                                                                                val
                                                                                            ) =>
                                                                                                setFieldValue(
                                                                                                    `rateInfos.${index}.effectiveDateStart`,
                                                                                                    formatUserInputDate(
                                                                                                        val
                                                                                                    )
                                                                                                ),
                                                                                    }}
                                                                                    endDateHint="mm/dd/yyyy"
                                                                                    endDateLabel="End date"
                                                                                    endDatePickerProps={{
                                                                                        disabled:
                                                                                            false,
                                                                                        id: `rateInfos.${index}.effectiveDateEnd`,
                                                                                        name: `rateInfos.${index}.effectiveDateEnd`,
                                                                                        'aria-required':
                                                                                            true,
                                                                                        defaultValue:
                                                                                            rateInfo.effectiveDateEnd,
                                                                                        onChange:
                                                                                            (
                                                                                                val
                                                                                            ) =>
                                                                                                setFieldValue(
                                                                                                    `rateInfos.${index}.effectiveDateEnd`,
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
                                                                        rateErrorHandling(
                                                                            errors
                                                                                ?.rateInfos?.[
                                                                                index
                                                                            ]
                                                                        )
                                                                            ?.rateDateCertified
                                                                    )}
                                                                >
                                                                    <Label
                                                                        htmlFor="rateDateCertified"
                                                                        id="rateDateCertifiedLabel"
                                                                    >
                                                                        {isRateTypeAmendment(
                                                                            rateInfo
                                                                        )
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
                                                                        rateErrorHandling(
                                                                            errors
                                                                                ?.rateInfos?.[
                                                                                index
                                                                            ]
                                                                        )
                                                                            ?.rateDateCertified
                                                                    ) && (
                                                                        <PoliteErrorMessage>
                                                                            {getIn(
                                                                                errors,
                                                                                `rateInfos.${index}.rateDateCertified`
                                                                            )}
                                                                        </PoliteErrorMessage>
                                                                    )}
                                                                    <DatePicker
                                                                        aria-required
                                                                        aria-describedby="rateDateCertifiedLabel rateDateCertifiedHint"
                                                                        id={`rateInfos.${index}.rateDateCertified`}
                                                                        name={`rateInfos.${index}.rateDateCertified`}
                                                                        defaultValue={
                                                                            rateInfo.rateDateCertified
                                                                        }
                                                                        onChange={(
                                                                            val
                                                                        ) =>
                                                                            setFieldValue(
                                                                                `rateInfos.${index}.rateDateCertified`,
                                                                                formatUserInputDate(
                                                                                    val
                                                                                )
                                                                            )
                                                                        }
                                                                    />
                                                                </FormGroup>
                                                            </>
                                                        )}
                                                        {arr.length > 1 &&
                                                            showMultiRates && (
                                                                <Button
                                                                    type="button"
                                                                    unstyled
                                                                    className={
                                                                        styles.removeContactBtn
                                                                    }
                                                                    onClick={() => {
                                                                        setFileItemsMatrix(
                                                                            (
                                                                                data
                                                                            ) => {
                                                                                data.splice(
                                                                                    index,
                                                                                    1
                                                                                )
                                                                                return data
                                                                            }
                                                                        )
                                                                        remove(
                                                                            index
                                                                        )
                                                                        setNewRateButtonFocus()
                                                                    }}
                                                                >
                                                                    Remove rate
                                                                </Button>
                                                            )}
                                                    </div>
                                                )
                                            )}
                                            {showMultiRates && (
                                                <button
                                                    type="button"
                                                    className={`usa-button usa-button--outline ${styles.addContactBtn}`}
                                                    onClick={() => {
                                                        const newRate =
                                                            rateInfoFormValues()
                                                        push(newRate)
                                                        setFocusNewRate(true)
                                                    }}
                                                    ref={newRateButtonRef}
                                                >
                                                    Add another rate
                                                    certification
                                                </button>
                                            )}
                                        </>
                                    )}
                                </FieldArray>
                            </fieldset>
                            <PageActions
                                backOnClick={async () => {
                                    // do not need to validate or submit if no documents are uploaded
                                    if (fileItemsMatrix.flat().length === 0) {
                                        navigate('../contract-details')
                                    } else {
                                        await handleFormSubmit(
                                            rateInfos,
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
                                    if (fileItemsMatrix.flat().length === 0) {
                                        await handleFormSubmit(
                                            rateInfos,
                                            setSubmitting,
                                            {
                                                shouldValidateDocuments: false,
                                                redirectPath: '/dashboard',
                                            }
                                        )
                                    } else {
                                        setFocusErrorSummaryHeading(true)
                                        await handleFormSubmit(
                                            rateInfos,
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
                )
            }}
        </Formik>
    )
}
