import React, { useEffect, useState } from 'react'
import { Form as UswdsForm, Button, ButtonGroup, Alert, Link } from '@trussworks/react-uswds'
import { NavLink, useHistory } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'

import styles from '../StateSubmissionForm.module.scss'
import {
    DraftSubmission,
    useUpdateDraftSubmissionMutation,
} from '../../../gen/gqlClient'
import { useS3 } from '../../../contexts/S3Context'
import { isS3Error } from '../../../s3'
import PageHeading from '../../../components/PageHeading'
import { isContractAndRates } from '../../../constants/submissions'
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
}

export const Documents = ({
    showValidations,
    draftSubmission,
}: DocumentProps): React.ReactElement => {
    const { deleteFile, uploadFile, getURL, getS3URL } = useS3()
    const [shouldValidate, setShouldValidate] = useState(showValidations)
    const [hasValidFiles, setHasValidFiles] = useState(false)
    const [fileItems, setFileItems] = useState<FileItemT[]>([]) // eventually this will include files from api
    const history = useHistory()
    const [
        updateDraftSubmission,
        { error: updateError },
    ] = useUpdateDraftSubmissionMutation()

    const keyFromS3URL = (url: string) => {
        const keyMatcher = /s3?:\/\/[a-z0-9]+\/([a-z0-9]+)\/[a-z0-9]+$/g
        const match = url.match(keyMatcher)
        return match ? match[0] : undefined
    }

    const fileItemsFromDraftSubmission: FileItemT[] | undefined =
        draftSubmission &&
        draftSubmission.documents.map((doc) => {
            return {
                id: uuidv4(),
                name: doc.name,
                url: doc.url,
                key: keyFromS3URL(doc.url || 'MISSING'),
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

        const s3URL = await getS3URL(s3Key, file.name)
        const link = await getURL(s3Key)
        return { key: s3Key, url: link, s3URL: s3URL }
    }

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setShouldValidate(true)
        if (!hasValidFiles) return

        const documents = fileItems.map((fileItem) => {
            if (!fileItem.url || !fileItem.s3URL)
                throw Error(
                    'The file item has no url or s3url, this should not happen onSubmit'
                )
            return {
                name: fileItem.name,
                url: fileItem.url,
                s3URL: fileItem.s3URL,
            }
        })

        const updatedDraft = updatesFromSubmission(draftSubmission)

        updatedDraft.documents = documents

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

    const Hint = (): JSX.Element =>
        isContractAndRates(draftSubmission) ? (
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
            <PageHeading className={styles.formHeader} headingLevel="h2"> Documents </PageHeading>
            <UswdsForm
                className={styles.formContainer}
                id="DocumentsForm"
                aria-label="Documents Form"
                onSubmit={handleFormSubmit}
            >
                <fieldset className="usa-fieldset">
                    <legend className='srOnly'>
                        Documents
                    </legend>
                    {shouldValidate && !hasValidFiles && (
                        <Alert
                            type="error"
                            heading="Missing documents"
                            className="margin-bottom-2"
                        >
                            You must upload at least one document
                        </Alert>
                    )}
                    <FileUpload
                        id="documents"
                        name="documents"
                        label="Upload documents"
                        hint={
                            <>
                                <Link
                                    href={
                                        'https://www.medicaid.gov/federal-policy-guidance/downloads/cib110819.pdf'
                                    }
                                    variant="external"
                                    target="_blank"
                                >
                                    Tip sheet for complete contract action
                                    submissions (opens in new window)
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
                        className={`${styles.outlineButtonLink} usa-button usa-button--outline`}
                        to="/dashboard"
                    >
                        Cancel
                    </Link>
                    <Button
                        type="submit"
                        secondary={shouldValidate && !hasValidFiles}
                        disabled={shouldValidate && !hasValidFiles}
                    >
                        Continue
                    </Button>
                </ButtonGroup>
            </UswdsForm>
        </>
    )
}
