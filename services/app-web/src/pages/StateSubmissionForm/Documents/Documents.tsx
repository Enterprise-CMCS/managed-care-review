import React, { useEffect, useState } from 'react'
import {
    GridContainer,
    Form,
    Button,
    ButtonGroup,
    Alert,
    Link,
} from '@trussworks/react-uswds'
import { NavLink, useHistory } from 'react-router-dom'

import styles from '../StateSubmissionForm.module.scss'
import {
    DraftSubmission,
    useUpdateDraftSubmissionMutation,
} from '../../../gen/gqlClient'
import { useS3 } from '../../../contexts/S3Context'
import { isS3Error } from '../../../s3'
import PageHeading from '../../../components/PageHeading'
import {
    FileUpload,
    S3FileData,
} from '../../../components/FileUpload/FileUpload'
import { FileItemT } from '../../../components/FileUpload/FileItem'

/* 
    Documents should error alerts for overall errors related to invalid documents for a submission, including no files added.
    Inline errors, specific to the individual files as they upload,  should be handled in FileUpload. 
*/

type DocumentProps = {
    showValidations?: boolean
    draftSubmission: DraftSubmission
}

export const Documents = ({
    showValidations,
    draftSubmission,
}: DocumentProps): React.ReactElement => {
    const { deleteFile, uploadFile, getURL } = useS3()
    const [shouldValidate, setShouldValidate] = useState(showValidations)
    const [hasValidFiles, setHasValidFiles] = useState(false)
    const [fileItems, setFileItems] = useState<FileItemT[]>([]) // eventually this will include files from api
    const history = useHistory()
    const [
        updateDraftSubmission,
        { error: updateError },
    ] = useUpdateDraftSubmissionMutation()

    useEffect(() => {
        const hasNoPendingFiles: boolean = fileItems.every(
            (item) => item.status !== 'PENDING'
        )

        const hasValidDocumentsForSubmission: boolean =
            fileItems.length > 0 &&
            hasNoPendingFiles &&
            fileItems.some(
                (item) =>
                    item.status === 'UPLOAD_COMPLETE' ||
                    item.status === 'SAVED_TO_SUBMISSION'
            )
        setHasValidFiles(hasValidDocumentsForSubmission)
    }, [fileItems])

    const showError = (error: string) => {
        if (!shouldValidate) setShouldValidate(true)
        console.log('Error', error)
    }

    if (updateError) {
        showError('Apollo error')
        console.log(updateError)
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

        const link = await getURL(s3Key)
        return { key: s3Key, url: link }
    }

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setShouldValidate(true)
        const documents = fileItems.map((file) => {
            if (!file.url)
                throw Error(
                    'The file has no url, this should not happen onSubmit'
                )
            return {
                name: file.name,
                url: file.url,
            }
        })

        const updatedDraft = {
            programID: draftSubmission.programID,
            submissionType: draftSubmission.submissionType,
            submissionDescription: draftSubmission.submissionDescription,
            documents,
        }

        try {
            const data = await updateDraftSubmission({
                variables: {
                    input: {
                        submissionID: draftSubmission.id,
                        draftSubmissionUpdates: updatedDraft,
                    },
                },
            })

            if (data.errors) {
                showError('gql errors have occurred')
            }

            if (data.data?.updateDraftSubmission)
                history.push(
                    `/submissions/${draftSubmission.id}/review-and-submit`
                )
        } catch (error) {
            showError(error)
        }
    }
    return (
        <GridContainer>
            <PageHeading headingLevel="h2"> Documents </PageHeading>
            <Form className="usa-form--large" onSubmit={handleFormSubmit}>
                {shouldValidate && !hasValidFiles && (
                    <Alert
                        type="error"
                        heading="Oops! Something went wrong. Invalid files or no files"
                    />
                )}
                <FileUpload
                    id="documents"
                    name="documents"
                    label="Upload Documents"
                    accept="application/pdf,text/csv,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    uploadFile={handleUploadFile}
                    deleteFile={handleDeleteFile}
                    onLoadComplete={onLoadComplete}
                />

                <ButtonGroup type="default" className={styles.buttonGroup}>
                    <Button
                        type="button"
                        secondary
                        onClick={() => setShouldValidate(!hasValidFiles)}
                    >
                        Test Validation
                    </Button>
                    <Link
                        asCustom={NavLink}
                        className="usa-button usa-button--outline"
                        variant="unstyled"
                        to="/dashboard"
                    >
                        Cancel
                    </Link>
                    <Button
                        type="submit"
                        secondary={shouldValidate && !hasValidFiles}
                        // disabled={shouldValidate && !hasValidFiles}
                    >
                        Continue
                    </Button>
                </ButtonGroup>
            </Form>
        </GridContainer>
    )
}
