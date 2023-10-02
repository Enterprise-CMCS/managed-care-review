import React, { useState } from 'react'
import { Form as UswdsForm, Link } from '@trussworks/react-uswds'
import { useNavigate } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'

import styles from '../StateSubmissionForm.module.scss'
import { SubmissionDocument } from '../../../common-code/healthPlanFormDataType'
import { useS3 } from '../../../contexts/S3Context'
import { isS3Error } from '../../../s3'
import {
    FileUpload,
    S3FileData,
    FileItemT,
    ACCEPTED_SUBMISSION_FILE_TYPES,
} from '../../../components/FileUpload'
import { PageActions } from '../PageActions'
import classNames from 'classnames'
import { ErrorSummary } from '../../../components/Form'
import type { HealthPlanFormPageProps } from '../StateSubmissionForm'
import { useLDClient } from 'launchdarkly-react-client-sdk'
import { featureFlags } from '../../../common-code/featureFlags'
import { RoutesRecord } from '../../../constants'

export const Documents = ({
    draftSubmission,
    previousDocuments,
    updateDraft,
}: HealthPlanFormPageProps): React.ReactElement => {
    const [shouldValidate, setShouldValidate] = useState(false)
    const isContractOnly = draftSubmission.submissionType === 'CONTRACT_ONLY'
    const navigate = useNavigate()
    const ldClient = useLDClient()

    const supportingDocsByRate = ldClient?.variation(
        featureFlags.SUPPORTING_DOCS_BY_RATE.flag,
        featureFlags.SUPPORTING_DOCS_BY_RATE.defaultValue
    )

    // Documents state management
    const { deleteFile, uploadFile, scanFile, getKey, getS3URL } = useS3()
    const [fileItems, setFileItems] = useState<FileItemT[]>([])
    const hasValidFiles = fileItems.every(
        (item) => item.status === 'UPLOAD_COMPLETE'
    )
    const [isSubmitting, setIsSubmitting] = useState(false) // mock same behavior as formik isSubmitting

    const hasMissingCategories =
        /* fileItems must have some document category.  a contract-only submission
       must have "CONTRACT_RELATED" as the document category. */
        fileItems.length > 0 &&
        (fileItems.some((docs) => docs.documentCategories.length === 0) ||
            (isContractOnly &&
                fileItems.some(
                    (docs) =>
                        !docs.documentCategories.includes('CONTRACT_RELATED')
                )))
    const hasLoadingFiles =
        fileItems.some((item) => item.status === 'PENDING') ||
        fileItems.some((item) => item.status === 'SCANNING')
    const showFileUploadError = shouldValidate && !hasValidFiles

    const documentsErrorMessages = () => {
        const errorsObject: { [k: string]: string } = {}
        fileItems.forEach((item) => {
            const key = item.id
            if (item.status === 'DUPLICATE_NAME_ERROR') {
                errorsObject[key] = 'You must remove duplicate files'
            } else if (item.status === 'SCANNING_ERROR') {
                errorsObject[key] =
                    'You must remove files that failed the security scan'
            } else if (item.status === 'UPLOAD_ERROR') {
                errorsObject[key] =
                    'You must remove or retry files that failed to upload'
            } else if (item.documentCategories.length === 0) {
                errorsObject[key] = 'You must select a document category'
            }
        })
        return errorsObject
    }

    // for supporting documents page, empty documents list is allowed
    const errorSummary =
        showFileUploadError && hasLoadingFiles
            ? 'You must wait for all documents to finish uploading before continuing'
            : (showFileUploadError && !hasValidFiles) ||
              (shouldValidate && hasMissingCategories)
            ? 'You must remove all documents with error messages before continuing'
            : undefined

    // Error summary state management
    const errorSummaryHeadingRef = React.useRef<HTMLHeadingElement>(null)
    const [focusErrorSummaryHeading, setFocusErrorSummaryHeading] =
        React.useState(false)

    React.useEffect(() => {
        // Focus the error summary heading only if we are displaying
        // validation errors and the heading element exists
        if (focusErrorSummaryHeading && errorSummaryHeadingRef.current) {
            errorSummaryHeadingRef.current.focus()
        }
        setFocusErrorSummaryHeading(false)
    }, [focusErrorSummaryHeading])

    const fileItemsFromDraftSubmission: FileItemT[] | undefined =
        draftSubmission &&
        draftSubmission.documents.map((doc) => {
            const key = getKey(doc.s3URL)
            if (!key) {
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
        })

    // If there is a submission error, ensure form is in validation state
    const onUpdateDraftSubmissionError = () => {
        if (!shouldValidate) setShouldValidate(true)
        setIsSubmitting(false)
    }

    const onFileItemsUpdate = async ({
        fileItems,
    }: {
        fileItems: FileItemT[]
    }) => {
        // When supportingDocsByRate flag is on, all documents on the supporting documents page are CONTRACT_RELATED.
        // If the files documentCategories contains a category we skip as to not overwrite existing documents.
        if (supportingDocsByRate) {
            fileItems = fileItems.map((file) =>
                file.documentCategories.length
                    ? file
                    : { ...file, documentCategories: ['CONTRACT_RELATED'] }
            )
        }
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

    /*
     * handleFormSubmit is used by all page actions
     * @param shouldValidateDocuments - if true prevent submission while validation errors are present; if false silently discard errors but allow submission
     * @param redirectPath - relative path within '/submissions/:id/' where application will redirect if submission succeeds
     *
     * Documents form changes are always persisted; all page action buttons trigger updateDraftSubmission
     * Back button will persist changes without validation
     * Save as Draft and Continue buttons requires user to clear validation errors
     */
    const handleFormSubmit =
        ({
            shouldValidateDocuments,
            redirectPath,
        }: {
            shouldValidateDocuments: boolean
            redirectPath: string
        }) =>
        async (e: React.FormEvent | React.MouseEvent) => {
            e.preventDefault()

            // Currently documents validation happens (outside of the yup schema, which only handles the formik form data)
            // if there are any errors present in the documents list and we are in a validation state (relevant for Save as Draft) force user to clear validations to continue
            if (shouldValidateDocuments) {
                if (!hasValidFiles || hasMissingCategories) {
                    setShouldValidate(true)
                    setFocusErrorSummaryHeading(true)
                    return
                }
            }

            const documents = fileItems.reduce(
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
                            'Attempting to save a seemingly valid file item with no sha256, this should not happen on form submit. Discarding file.'
                        )
                    } else {
                        formDataDocuments.push({
                            name: fileItem.name,
                            s3URL: fileItem.s3URL,
                            sha256: fileItem.sha256,
                            documentCategories:
                                fileItem.documentCategories || [],
                        })
                    }
                    return formDataDocuments
                },
                [] as SubmissionDocument[]
            )

            draftSubmission.documents = documents
            setIsSubmitting(true)
            try {
                const updatedSubmission = await updateDraft(draftSubmission)
                if (updatedSubmission instanceof Error) {
                    console.info(
                        'Error updating draft submission on docs page',
                        updatedSubmission
                    )
                    onUpdateDraftSubmissionError()
                } else if (updatedSubmission) {
                    navigate(redirectPath)
                }
            } catch (error) {
                onUpdateDraftSubmissionError()
            }
        }

    return (
        <>
            <UswdsForm
                className={classNames(
                    styles.tableContainer,
                    styles.formContainer
                )}
                id="DocumentsForm"
                aria-label="Documents Form"
                onSubmit={async (e) => {
                    await handleFormSubmit({
                        shouldValidateDocuments: true,
                        redirectPath: `../review-and-submit`,
                    })(e)
                }}
            >
                <fieldset className="usa-fieldset">
                    <legend className="srOnly">Supporting Documents</legend>

                    <ErrorSummary
                        errors={
                            Object.keys(documentsErrorMessages()).length > 0 &&
                            shouldValidate
                                ? {
                                      ...documentsErrorMessages(),
                                  }
                                : {}
                        }
                        headingRef={errorSummaryHeadingRef}
                    />
                    <FileUpload
                        id="documents"
                        name="documents"
                        label="Upload contract-supporting documents"
                        renderMode={supportingDocsByRate ? 'list' : 'table'}
                        hint={
                            <>
                                <Link
                                    aria-label="Document definitions and requirements (opens in new window)"
                                    href={'/help#supporting-documents'}
                                    variant="external"
                                    target="_blank"
                                >
                                    Document definitions and requirements
                                </Link>
                                <span className="padding-top-05">
                                    Upload any supporting documents related to
                                    the contract.
                                </span>
                                <span className="padding-top-1">
                                    This input only accepts PDF, CSV, DOC, DOCX,
                                    XLS, XLSX files.
                                </span>
                            </>
                        }
                        error={errorSummary}
                        accept={ACCEPTED_SUBMISSION_FILE_TYPES}
                        initialItems={fileItemsFromDraftSubmission}
                        uploadFile={handleUploadFile}
                        scanFile={handleScanFile}
                        deleteFile={handleDeleteFile}
                        onFileItemsUpdate={onFileItemsUpdate}
                        isContractOnly={isContractOnly}
                        shouldDisplayMissingCategoriesError={
                            !isContractOnly &&
                            shouldValidate &&
                            hasMissingCategories
                        }
                    />
                </fieldset>
                <PageActions
                    saveAsDraftOnClick={async (e) => {
                        await handleFormSubmit({
                            shouldValidateDocuments: true,
                            redirectPath: RoutesRecord.DASHBOARD_SUBMISSIONS,
                        })(e)
                    }}
                    backOnClick={async (e) => {
                        await handleFormSubmit({
                            shouldValidateDocuments: false,
                            redirectPath: `../contacts`,
                        })(e)
                    }}
                    disableContinue={
                        showFileUploadError && fileItems.length > 0
                    }
                    actionInProgress={isSubmitting}
                />
            </UswdsForm>
        </>
    )
}
