import React, { useEffect, useState } from 'react'
import {
    Alert,
    Form as UswdsForm,
    Button,
    ButtonGroup,
    Link,
} from '@trussworks/react-uswds'
import { useHistory } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'

import styles from '../StateSubmissionForm.module.scss'
import {
    DraftSubmission,
    UpdateDraftSubmissionInput,
} from '../../../gen/gqlClient'
import { useS3 } from '../../../contexts/S3Context'
import { isS3Error } from '../../../s3'
import {
    FileUpload,
    S3FileData,
    FileItemT,
} from '../../../components/FileUpload'
import { updatesFromSubmission } from '../updateSubmissionTransform'

/*
 * The page level component is responsible for setting up api requests, redirects, and handling page level alert for overall errors related to invalid documents for a submission
 * Inline error that are specific to the individual files as they upload are handled in FileUpload and FileItem.
 */

type DocumentProps = {
    draftSubmission: DraftSubmission
    formAlert?: React.ReactElement
    updateDraft: (
        input: UpdateDraftSubmissionInput
    ) => Promise<DraftSubmission | undefined>
}

export const Documents = ({
    draftSubmission,
    updateDraft,
    formAlert = undefined,
}: DocumentProps): React.ReactElement => {
    const { deleteFile, uploadFile, scanFile, getKey, getS3URL } = useS3()
    const [shouldValidate, setShouldValidate] = useState(false)
    const [fileItems, setFileItems] = useState<FileItemT[]>([]) // eventually this will include files from api
    const history = useHistory()
    const hasValidFiles = fileItems.every(
        (item) => item.status === 'UPLOAD_COMPLETE'
    )
    const showFileUploadError = shouldValidate && !hasValidFiles
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

    // If there is a submission error, ensure form is in validation state
    const onUpdateDraftSubmissionError = () => {
        if (!shouldValidate) setShouldValidate(true)
    }

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

    /*
     * handleFormSubmit is used by all page actions
     * @param shouldValidate - if true prevent submission while validation errors are present; if false silently discard errors but allow submission
     * @param redirectPath - relative path within '/submissions/:id/' where application will redirect if submission succeeds
     *
     * Documents form changes are always persisted; all page action buttons trigger updateDraftSubmission
     * Back button will persist changes without validation
     * Save as Draft and Continue buttons requires user to clear validation errors
     */
    const handleFormSubmit =
        ({
            shouldValidate,
            redirectPath,
        }: {
            shouldValidate: boolean
            redirectPath: string
        }) =>
        async (e: React.FormEvent | React.MouseEvent) => {
            e.preventDefault()

            // if there are any errors present in supporting documents and we are in a validation state (relevant for Save as Draft and Continue buttons), stop here.
            // Force user to clear validations to continue
            if (shouldValidate) {
                setShouldValidate(true)
                if (!hasValidFiles) return
            }

            const documents = fileItems.reduce(
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

            updatedDraft.documents = documents

            try {
                const updatedSubmission = await updateDraft({
                    submissionID: draftSubmission.id,
                    draftSubmissionUpdates: updatedDraft,
                })
                if (updatedSubmission) {
                    history.push(redirectPath)
                }
            } catch (error) {
                onUpdateDraftSubmissionError()
            }
        }

    return (
        <>
            <UswdsForm
                className={styles.formContainer}
                id="DocumentsForm"
                aria-label="Documents Form"
                onSubmit={async (e) => {
                    await handleFormSubmit({
                        shouldValidate: true,
                        redirectPath: `review-and-submit`,
                    })(e)
                }}
            >
                <fieldset className="usa-fieldset">
                    <legend className="srOnly">Supporting Documents</legend>

                    {showFileUploadError && (
                        <Alert
                            type="error"
                            heading="Remove files with errors"
                            className="margin-bottom-2"
                        >
                            You must remove all documents with error messages
                            before continuing
                        </Alert>
                    )}
                    {formAlert && formAlert}
                    <FileUpload
                        id="documents"
                        name="documents"
                        label="Upload supporting documents"
                        isLabelVisible={false}
                        hint={
                            <>
                                <Link
                                    aria-label="Document definitions and requirements (opens in new window)"
                                    href={
                                        'https://www.medicaid.gov/federal-policy-guidance/downloads/cib110819.pdf'
                                    }
                                    variant="external"
                                    target="_blank"
                                >
                                    Document definitions and requirements
                                </Link>

                                <p
                                    data-testid="documents-hint"
                                    className="text-base-darker"
                                >
                                    <strong>
                                        Upload and categorize any additional
                                        supporting documents
                                    </strong>
                                </p>
                            </>
                        }
                        error={
                            showFileUploadError
                                ? ' You must remove all documents with error messages before continuing'
                                : undefined
                        }
                        accept="application/pdf,text/csv,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                        initialItems={fileItemsFromDraftSubmission}
                        uploadFile={handleUploadFile}
                        scanFile={handleScanFile}
                        deleteFile={handleDeleteFile}
                        onFileItemsUpdate={onFileItemsUpdate}
                    />
                </fieldset>

                <div className={styles.pageActions}>
                    <Button
                        type="button"
                        unstyled
                        onClick={async (e) => {
                            await handleFormSubmit({
                                shouldValidate: true,
                                redirectPath: '/dashboard',
                            })(e)
                        }}
                    >
                        Save as draft
                    </Button>
                    <ButtonGroup type="default" className={styles.buttonGroup}>
                        <Button
                            type="button"
                            outline
                            onClick={async (e) => {
                                await handleFormSubmit({
                                    shouldValidate: false,
                                    redirectPath: 'contacts',
                                })(e)
                            }}
                        >
                            Back
                        </Button>
                        <Button
                            type="submit"
                            disabled={
                                showFileUploadError && fileItems.length > 0
                            }
                        >
                            Continue
                        </Button>
                    </ButtonGroup>
                </div>
            </UswdsForm>
        </>
    )
}
