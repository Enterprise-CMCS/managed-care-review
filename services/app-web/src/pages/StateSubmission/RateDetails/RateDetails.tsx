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
    ActuaryContact,
    ActuaryCommunicationType,
    packageName,
} from '@managed-care-review/common-code/healthPlanFormDataType'

import {
    FileUpload,
    S3FileData,
    FileItemT,
    ErrorSummary,
    FieldRadio,
    PoliteErrorMessage,
    ProgramSelect,
    PackageSelect,
    FieldYesNo,
} from '../../../components'
import type { PackageOptionType } from '../../../components/Select'
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
import { useStatePrograms, useFocus } from '../../../hooks'
import { ActuaryContactFields } from '../Contacts'
import { useIndexHealthPlanPackagesQuery } from '../../../gen/gqlClient'
import { recordJSException } from '../../../otelHelpers'
import { dayjs } from '@managed-care-review/common-code/dateHelpers'
import { SharedRateCertDisplay } from '@managed-care-review/common-code/healthPlanFormDataType/UnlockedHealthPlanFormDataType'
import { getCurrentRevisionFromHealthPlanPackage } from '../../../gqlHelpers'
import { featureFlags } from '@managed-care-review/common-code/featureFlags'
import { useLDClient } from 'launchdarkly-react-client-sdk'

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
    key: string
    rateType: RateType | undefined
    rateCapitationType: RateCapitationType | undefined
    rateDateStart: string
    rateDateEnd: string
    rateDateCertified: string
    effectiveDateStart: string
    effectiveDateEnd: string
    rateProgramIDs: string[]
    rateDocuments: SubmissionDocument[]
    actuaryContacts: ActuaryContact[]
    actuaryCommunicationPreference?: ActuaryCommunicationType
    packagesWithSharedRateCerts: SharedRateCertDisplay[]
    hasSharedRateCert?: 'YES' | 'NO'
}

type FormError =
    FormikErrors<RateInfoFormType>[keyof FormikErrors<RateInfoFormType>]

export const rateErrorHandling = (
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

    // Feature flags state management
    const ldClient = useLDClient()
    const showPackagesWithSharedRatesDropdown: boolean = ldClient?.variation(
        featureFlags.PACKAGES_WITH_SHARED_RATES.flag,
        featureFlags.PACKAGES_WITH_SHARED_RATES.defaultValue
    )

    // Rate documents state management
    const [focusErrorSummaryHeading, setFocusErrorSummaryHeading] =
        React.useState(false)
    const errorSummaryHeadingRef = React.useRef<HTMLHeadingElement>(null)
    const [shouldValidate, setShouldValidate] = React.useState(showValidations)
    const [focusNewRate, setFocusNewRate] = React.useState(false)
    const newRateNameRef = React.useRef<HTMLElement | null>(null)
    const [newRateButtonRef, setNewRateButtonFocus] = useFocus() // This ref.current is always the same element
    const [packageOptions, setPackageOptions] = React.useState<
        PackageOptionType[]
    >([])

    const rateDetailsFormSchema = RateDetailsFormSchema({
        'packages-with-shared-rates': showPackagesWithSharedRatesDropdown,
    })

    const { loading, error } = useIndexHealthPlanPackagesQuery({
        onCompleted: async (data) => {
            const packagesWithUpdatedAt: Array<
                { updatedAt: Date } & PackageOptionType
            > = []
            data?.indexHealthPlanPackages.edges
                .map((edge) => edge.node)
                .forEach((sub) => {
                    const currentRevisionPackageOrError =
                        getCurrentRevisionFromHealthPlanPackage(sub)
                    if (currentRevisionPackageOrError instanceof Error) {
                        recordJSException(
                            `indexHealthPlanPackagesQuery: Error decoding proto. ID: ${sub.id}`
                        )
                        return null // TODO make an error state for PackageSelect, right now we just remove from page if this request fails
                    }
                    const [currentRevision, currentSubmissionData] =
                        currentRevisionPackageOrError

                    // Exclude active submission and contract_only submissions from list.
                    if (
                        currentSubmissionData.id !== draftSubmission.id &&
                        currentSubmissionData.submissionType ===
                            'CONTRACT_AND_RATES'
                    ) {
                        const submittedAt = currentRevision.submitInfo
                            ?.updatedAt
                            ? ` (Submitted ${dayjs(
                                  currentRevision.submitInfo.updatedAt
                              )
                                  .tz('UTC')
                                  .format('MM/DD/YY')})`
                            : ` (Draft)`

                        packagesWithUpdatedAt.push({
                            updatedAt: currentSubmissionData.updatedAt,
                            label: `${packageName(
                                currentSubmissionData,
                                statePrograms
                            )}${submittedAt}`,
                            value: currentSubmissionData.id,
                        })
                    }
                })

            const packagesList = packagesWithUpdatedAt.sort((a, b) =>
                a['updatedAt'] > b['updatedAt'] ? -1 : 1
            )
            setPackageOptions(packagesList)
        },
        onError: (error) => {
            recordJSException(
                `indexHealthPlanPackagesQuery: Error querying health plan packages. ID: ${draftSubmission.id} Error message: ${error.message}`
            )
            return null
        },
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
                            sha256: doc.sha256,
                            status: 'UPLOAD_ERROR',
                            documentCategories: doc.documentCategories,
                        }
                    }
                    return {
                        id: uuidv4(),
                        name: doc.name,
                        key: key,
                        s3URL: doc.s3URL,
                        sha256: doc.sha256,
                        status: 'UPLOAD_COMPLETE',
                        documentCategories: doc.documentCategories,
                    }
                })) ||
            []
        )
    }

    const rateInfoFormValues = (rateInfo?: RateInfoType): RateInfoFormType => ({
        //UUID is needed here as a unique component key prop to track mapped rateInfo in Formik Field array. This ensures we remove the correct FileUpload component when removing a rate.
        key: uuidv4(),
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
        actuaryContacts:
            rateInfo?.actuaryContacts && rateInfo?.actuaryContacts.length > 0
                ? rateInfo.actuaryContacts
                : [
                      {
                          name: '',
                          titleRole: '',
                          email: '',
                          actuarialFirm: undefined,
                          actuarialFirmOther: '',
                      },
                  ],
        actuaryCommunicationPreference:
            rateInfo?.actuaryCommunicationPreference ?? undefined,
        packagesWithSharedRateCerts:
            rateInfo?.packagesWithSharedRateCerts ?? [],
        hasSharedRateCert:
            rateInfo?.packagesWithSharedRateCerts === undefined
                ? undefined
                : (rateInfo?.packagesWithSharedRateCerts &&
                      rateInfo?.packagesWithSharedRateCerts.length) >= 1
                ? 'YES'
                : 'NO',
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

    const rateInfosInitialValues: RateInfoArrayType = {
        rateInfos:
            draftSubmission.rateInfos.length > 0
                ? draftSubmission.rateInfos.map((rateInfo) =>
                      rateInfoFormValues(rateInfo)
                  )
                : [rateInfoFormValues()],
    }

    const processFileItems = (fileItems: FileItemT[]): SubmissionDocument[] => {
        return fileItems.reduce((formDataDocuments, fileItem) => {
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
            } else if (!fileItem.s3URL)
                console.info(
                    'Attempting to save a seemingly valid file item is not yet uploaded to S3, this should not happen on form submit. Discarding file.'
                )
            else {
                formDataDocuments.push({
                    name: fileItem.name,
                    s3URL: fileItem.s3URL,
                    sha256: fileItem.sha256,
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
                supportingDocuments: [],
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
                actuaryContacts: rateInfo.actuaryContacts,
                actuaryCommunicationPreference:
                    rateInfo.actuaryCommunicationPreference,
                packagesWithSharedRateCerts:
                    rateInfo.hasSharedRateCert === 'YES'
                        ? rateInfo.packagesWithSharedRateCerts
                        : [],
            }
        })

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
                        //rateProgramIDs error message needs a # proceeding the key name because this is the only way to be able to link to the Select component element see comments in ErrorSummaryMessage component.
                        const errorKey =
                            field === 'rateProgramIDs' ||
                            field === 'packagesWithSharedRateCerts'
                                ? `#rateInfos.${index}.${field}`
                                : `rateInfos.${index}.${field}`
                        errorObject[errorKey] = value
                    }
                    //If the field is actuaryContacts then the value should be an array with at least one object of errors
                    if (
                        field === 'actuaryContacts' &&
                        Array.isArray(value) &&
                        Array.length > 0
                    ) {
                        //Currently, rate certifications only have 1 actuary contact
                        const actuaryContact = value[0]
                        Object.entries(actuaryContact).forEach(
                            ([contactField, contactValue]) => {
                                if (typeof contactValue === 'string') {
                                    const errorKey = `rateInfos.${index}.actuaryContacts.0.${contactField}`
                                    errorObject[errorKey] = contactValue
                                }
                            }
                        )
                    }
                })
            })
        }

        return errorObject
    }

    const handleRateInfoLegend = (index: number) => {
        return `Rate certification ${index + 1}`
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
                                                (rateInfo, index) => (
                                                    <Fieldset
                                                        data-testid={`rate-certification-form`}
                                                        key={rateInfo.key}
                                                        id={`rateInfos.${index}.container.${rateInfo.key}`}
                                                        legend={handleRateInfoLegend(
                                                            index
                                                        )}
                                                        className={
                                                            styles.rateCertContainer
                                                        }
                                                    >
                                                        <FormGroup
                                                            error={
                                                                showFileUploadError &&
                                                                !!getDocumentsError(
                                                                    fileItemsMatrix[
                                                                        index
                                                                    ],
                                                                    index
                                                                )
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
                                                                    <span
                                                                        className={
                                                                            styles.guidanceTextBlock
                                                                        }
                                                                    >
                                                                        <span className="text-ink">
                                                                            Upload
                                                                            one
                                                                            rate
                                                                            certification
                                                                            only.
                                                                        </span>
                                                                        <span className="text-ink">
                                                                            Additional
                                                                            rates
                                                                            and
                                                                            supporting
                                                                            documents
                                                                            can
                                                                            be
                                                                            added
                                                                            later.
                                                                        </span>
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
                                                                        <span className="padding-top-1">
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
                                                                    </span>
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
                                                                            fileMatrix
                                                                        ) => {
                                                                            const newMatrix =
                                                                                [
                                                                                    ...fileMatrix,
                                                                                ]
                                                                            newMatrix.splice(
                                                                                index,
                                                                                1,
                                                                                fileItems
                                                                            )
                                                                            return newMatrix
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
                                                        {showPackagesWithSharedRatesDropdown && (
                                                            <FormGroup
                                                                error={
                                                                    showFieldErrors(
                                                                        rateErrorHandling(
                                                                            errors
                                                                                ?.rateInfos?.[
                                                                                index
                                                                            ]
                                                                        )
                                                                            ?.hasSharedRateCert
                                                                    ) ||
                                                                    showFieldErrors(
                                                                        rateErrorHandling(
                                                                            errors
                                                                                ?.rateInfos?.[
                                                                                index
                                                                            ]
                                                                        )
                                                                            ?.packagesWithSharedRateCerts
                                                                    )
                                                                }
                                                            >
                                                                <FieldYesNo
                                                                    className={
                                                                        styles.radioGroup
                                                                    }
                                                                    id={`hasSharedRateCert.${index}.`}
                                                                    name={`rateInfos.${index}.hasSharedRateCert`}
                                                                    label="Was
                                                                            this
                                                                            rate
                                                                            certification
                                                                            uploaded
                                                                            to
                                                                            any
                                                                            other
                                                                            submissions?"
                                                                    showError={showFieldErrors(
                                                                        rateErrorHandling(
                                                                            errors
                                                                                ?.rateInfos?.[
                                                                                index
                                                                            ]
                                                                        )
                                                                            ?.hasSharedRateCert
                                                                    )}
                                                                />

                                                                {rateInfo.hasSharedRateCert ===
                                                                    'YES' && (
                                                                    <>
                                                                        <Label
                                                                            htmlFor={`rateInfos.${index}.packagesWithSharedRateCerts`}
                                                                        >
                                                                            Please
                                                                            select
                                                                            the
                                                                            submissions
                                                                            that
                                                                            also
                                                                            contain
                                                                            this
                                                                            rate
                                                                            certification.
                                                                        </Label>
                                                                        <Link
                                                                            aria-label="View all submissions (opens in new window)"
                                                                            href={
                                                                                '/dashboard'
                                                                            }
                                                                            variant="external"
                                                                            target="_blank"
                                                                        >
                                                                            View
                                                                            all
                                                                            submissions
                                                                        </Link>
                                                                        {showFieldErrors(
                                                                            rateErrorHandling(
                                                                                errors
                                                                                    ?.rateInfos?.[
                                                                                    index
                                                                                ]
                                                                            )
                                                                                ?.packagesWithSharedRateCerts
                                                                        ) && (
                                                                            <PoliteErrorMessage>
                                                                                {getIn(
                                                                                    errors,
                                                                                    `rateInfos.${index}.packagesWithSharedRateCerts`
                                                                                )}
                                                                            </PoliteErrorMessage>
                                                                        )}
                                                                        <PackageSelect
                                                                            //This key is required here because the combination of react-select, defaultValue, formik and apollo useQuery
                                                                            // causes issues with the default value when reloading the page
                                                                            key={`${packageOptions}-${rateInfo.key}`}
                                                                            inputId={`rateInfos.${index}.packagesWithSharedRateCerts`}
                                                                            name={`rateInfos.${index}.packagesWithSharedRateCerts`}
                                                                            statePrograms={
                                                                                statePrograms
                                                                            }
                                                                            initialValues={rateInfo.packagesWithSharedRateCerts.map(
                                                                                (
                                                                                    item
                                                                                ) =>
                                                                                    item.packageId
                                                                                        ? item.packageId
                                                                                        : ''
                                                                            )}
                                                                            packageOptions={
                                                                                packageOptions
                                                                            }
                                                                            draftSubmissionId={
                                                                                draftSubmission.id
                                                                            }
                                                                            isLoading={
                                                                                loading
                                                                            }
                                                                            error={
                                                                                error instanceof
                                                                                Error
                                                                            }
                                                                            onChange={(
                                                                                selectedOptions
                                                                            ) =>
                                                                                setFieldValue(
                                                                                    `rateInfos.${index}.packagesWithSharedRateCerts`,
                                                                                    selectedOptions.map(
                                                                                        (
                                                                                            item: PackageOptionType
                                                                                        ) => {
                                                                                            return {
                                                                                                packageName:
                                                                                                    item.label.replace(
                                                                                                        /\s\(.*?\)/g,
                                                                                                        ''
                                                                                                    ),
                                                                                                packageId:
                                                                                                    item.value,
                                                                                            }
                                                                                        }
                                                                                    )
                                                                                )
                                                                            }
                                                                        />
                                                                    </>
                                                                )}
                                                            </FormGroup>
                                                        )}
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
                                                                            selectedOptions
                                                                        ) =>
                                                                            form.setFieldValue(
                                                                                `rateInfos.${index}.rateProgramIDs`,
                                                                                selectedOptions.map(
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
                                                                    aria-label="Rate certification type definitions (opens in new window)"
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
                                                                        htmlFor={`rateInfos.${index}.rateDateCertified`}
                                                                        id={`rateDateCertifiedLabel.${index}`}
                                                                    >
                                                                        {isRateTypeAmendment(
                                                                            rateInfo
                                                                        )
                                                                            ? 'Date certified for rate amendment'
                                                                            : 'Date certified'}
                                                                    </Label>
                                                                    <div
                                                                        className="usa-hint"
                                                                        id={`rateDateCertifiedHint.${index}`}
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
                                                                        aria-describedby={`rateDateCertifiedLabel.${index} rateDateCertifiedHint.${index}`}
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
                                                        <FormGroup>
                                                            <ActuaryContactFields
                                                                actuaryContact={
                                                                    rateInfo
                                                                        .actuaryContacts[0]
                                                                }
                                                                errors={errors}
                                                                shouldValidate={
                                                                    shouldValidate
                                                                }
                                                                fieldNamePrefix={`rateInfos.${index}.actuaryContacts.0`}
                                                                fieldSetLegend="Certifying Actuary"
                                                            />
                                                        </FormGroup>
                                                        {index >= 1 && (
                                                            <Button
                                                                type="button"
                                                                unstyled
                                                                className={
                                                                    styles.removeContactBtn
                                                                }
                                                                onClick={() => {
                                                                    setFileItemsMatrix(
                                                                        (
                                                                            fileMatrix
                                                                        ) => {
                                                                            const newMatrix =
                                                                                [
                                                                                    ...fileMatrix,
                                                                                ]
                                                                            newMatrix.splice(
                                                                                index,
                                                                                1
                                                                            )
                                                                            return newMatrix
                                                                        }
                                                                    )
                                                                    remove(
                                                                        index
                                                                    )
                                                                    setNewRateButtonFocus()
                                                                }}
                                                            >
                                                                Remove rate
                                                                certification
                                                            </Button>
                                                        )}
                                                    </Fieldset>
                                                )
                                            )}
                                            <button
                                                type="button"
                                                className={`usa-button usa-button--outline ${styles.addContactBtn}`}
                                                onClick={() => {
                                                    const newRate =
                                                        rateInfoFormValues()
                                                    push(newRate)
                                                    setFileItemsMatrix(
                                                        (fileMatrix) => {
                                                            const newMatrix = [
                                                                ...fileMatrix,
                                                            ]
                                                            newMatrix.push([])
                                                            return newMatrix
                                                        }
                                                    )
                                                    setFocusNewRate(true)
                                                }}
                                                ref={newRateButtonRef}
                                            >
                                                Add another rate certification
                                            </button>
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
                                disableContinue={
                                    (shouldValidate &&
                                        !!Object.keys(errors).length) ||
                                    showFileUploadError
                                }
                                actionInProgress={isSubmitting}
                            />
                        </UswdsForm>
                    </>
                )
            }}
        </Formik>
    )
}
