import React, { useEffect, useState } from 'react'
import {
    Alert,
    Form as UswdsForm,
    Button,
    ButtonGroup,
    Link,
} from '@trussworks/react-uswds'
import { NavLink, useHistory } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'

import styles from '../StateSubmissionForm.module.scss'
import {
    DraftSubmission,
    UpdateDraftSubmissionInput,
} from '../../../gen/gqlClient'
import { useS3 } from '../../../contexts/S3Context'
import { isS3Error } from '../../../s3'
import PageHeading from '../../../components/PageHeading'
import {
    FileUpload,
    S3FileData,
} from '../../../components/FileUpload/FileUpload'
import { FileItemT } from '../../../components/FileUpload/FileItem'
import { updatesFromSubmission } from '../updateSubmissionTransform'

/* 
    Documents should error alerts for overall errors related to invalid documents for a submission, including no files added.
    Inline errors, specific to the individual files as they upload,  should be handled in FileUpload. 
*/

type DocumentProps = {
    showValidations?: boolean
    draftSubmission: DraftSubmission
    formAlert?: React.ReactElement
    updateDraft: (
        input: UpdateDraftSubmissionInput
    ) => Promise<DraftSubmission | undefined>
}

export const Documents = ({
    showValidations,
    draftSubmission,
    updateDraft,
    formAlert = undefined,
}: DocumentProps): React.ReactElement => {
    const { deleteFile, uploadFile, getKey, getS3URL } = useS3()
    const [shouldValidate, setShouldValidate] = useState(showValidations)
    const redirectToDashboard = React.useRef(false)
    const [hasValidFiles, setHasValidFiles] = useState(false)
    const [fileItems, setFileItems] = useState<FileItemT[]>([]) // eventually this will include files from api
    const history = useHistory()

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

    useEffect(() => {
        const hasNoPendingFiles: boolean = fileItems.every(
            (item) => item.status !== 'PENDING'
        )

        const hasValidDocumentsForSubmission: boolean =
            fileItems.length > 0 &&
            hasNoPendingFiles &&
            fileItems.some((item) => item.status === 'UPLOAD_COMPLETE')
        setHasValidFiles(hasValidDocumentsForSubmission)
    }, [fileItems])

    const showError = (error: string) => {
        console.log('Document error: ', error)
        if (!shouldValidate) setShouldValidate(true)
    }

    const onLoadComplete = ({ files }: { files: FileItemT[] }) => {
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
            throw new Error(`Error in S3 filename: ${file.name}`)
        }

        const s3URL = await getS3URL(s3Key, file.name)
        return { key: s3Key, s3URL: s3URL }
    }

    const handleFormSubmit = async (e: React.FormEvent | React.MouseEvent) => {
        e.preventDefault()
        setShouldValidate(true)
        if (!hasValidFiles) return

        const documents = fileItems.map((fileItem) => {
            if (!fileItem.s3URL)
                throw Error(
                    'The file item has no s3url, this should not happen onSubmit'
                )
            return {
                name: fileItem.name,
                s3URL: fileItem.s3URL,
            }
        })

        const updatedDraft = updatesFromSubmission(draftSubmission)

        updatedDraft.documents = documents

        try {
            const updatedSubmission = await updateDraft({
                submissionID: draftSubmission.id,
                draftSubmissionUpdates: updatedDraft,
            })
            if (updatedSubmission) {
                if (redirectToDashboard.current) {
                    history.push(`/dashboard`)
                } else {
                    history.push(
                        `/submissions/${draftSubmission.id}/review-and-submit`
                    )
                }
            }
        } catch (error) {
            showError(error)
            redirectToDashboard.current = false
        }
    }

    const Hint = (): JSX.Element =>
        draftSubmission.submissionType === 'CONTRACT_AND_RATES' ? (
            <>
                <strong>Must include:</strong> an executed contract and a signed
                rate certification
            </>
        ) : (
            <>
                <strong>Must include:</strong> an executed contract
            </>
        )

    return (
        <>
            <PageHeading className={styles.formHeader} headingLevel="h2">
                Documents
            </PageHeading>
            <UswdsForm
                className={styles.formContainer}
                id="DocumentsForm"
                aria-label="Documents Form"
                onSubmit={handleFormSubmit}
            >
                <fieldset className="usa-fieldset">
                    <legend className="srOnly">Documents</legend>
                    {shouldValidate && !hasValidFiles && (
                        <Alert
                            type="error"
                            heading="Missing documents"
                            className="margin-bottom-2"
                        >
                            You must upload at least one document
                        </Alert>
                    )}
                    {formAlert && formAlert}
                    <FileUpload
                        id="documents"
                        name="documents"
                        label="Upload documents"
                        hint={
                            <>
                                <Link
                                    aria-label="Tip sheet for complete contract action
                                submissions (opens in new window)"
                                    href={
                                        'https://www.medicaid.gov/federal-policy-guidance/downloads/cib110819.pdf'
                                    }
                                    variant="external"
                                    target="_blank"
                                >
                                    Tip sheet for complete contract action
                                    submissions
                                </Link>

                                <p
                                    data-testid="documents-hint"
                                    className="text-base-darker"
                                >
                                    <Hint />
                                </p>
                            </>
                        }
                        accept="application/pdf,text/csv,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                        initialItems={fileItemsFromDraftSubmission}
                        uploadFile={handleUploadFile}
                        deleteFile={handleDeleteFile}
                        onLoadComplete={onLoadComplete}
                    />
                </fieldset>

                <div className={styles.pageActions}>
                    <Button
                        type="button"
                        unstyled
                        disabled={shouldValidate && !hasValidFiles}
                        onClick={async (e) => {
                            redirectToDashboard.current = true
                            await handleFormSubmit(e)
                        }}
                    >
                        Save as Draft
                    </Button>
                    <ButtonGroup type="default" className={styles.buttonGroup}>
                        <Link
                            asCustom={NavLink}
                            className="usa-button usa-button--outline"
                            variant="unstyled"
                            to="rate-details"
                        >
                            Back
                        </Link>
                        <Button
                            type="submit"
                            secondary={shouldValidate && !hasValidFiles}
                            disabled={shouldValidate && !hasValidFiles}
                        >
                            Continue
                        </Button>
                    </ButtonGroup>
                </div>
            </UswdsForm>
        </>
    )
}
