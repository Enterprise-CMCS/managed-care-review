import React, { FormEvent, useEffect, useState } from 'react'
import { GridContainer, Form as UswdsForm, FormGroup, Link } from '@trussworks/react-uswds'
import styles from '../../StateSubmission/StateSubmissionForm.module.scss'
import { useParams } from 'react-router-dom'
import { useS3 } from '../../../contexts/S3Context'
import { ErrorSummary, FileItemT, FileUpload } from '../../../components'
import { useFileUpload } from '../../../hooks/useFileUpload'
import { ACCEPTED_SUBMISSION_FILE_TYPES } from '../../../components/FileUpload'
import { PageActions } from '../../StateSubmission/PageActions'

export const UploadQuestions = () => {
    const { division } = useParams<{ division: string }>()
    const [shouldValidate, setShouldValidate] = React.useState(false)

    /* Documents state management */
    const { handleDeleteFile, handleUploadFile, handleScanFile } = useS3()
    const {
        hasValidFiles,
        hasLoadingFiles,
        onFileItemsUpdate,
        fileItems,
    } = useFileUpload()
    const [isSubmitting, setIsSubmitting] = useState(false) // mock same behavior as formik isSubmitting
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
        fileItems.length === 0 ? 'documents' : '#file-items-list'



    /* Error summary state management */
    const errorSummaryHeadingRef = React.useRef<HTMLHeadingElement>(null)
    const [focusErrorSummaryHeading, setFocusErrorSummaryHeading] =
        React.useState(false)
        useEffect(() => {
            // Focus the error summary heading only if we are displaying
            // validation errors and the heading element exists
            if (focusErrorSummaryHeading && errorSummaryHeadingRef.current) {
                errorSummaryHeadingRef.current.focus()
            }
            setFocusErrorSummaryHeading(false)
        }, [focusErrorSummaryHeading])

   const handleFormSubmit = async (
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
                setSubmitting(false)
                return
            }
        }


        try {
            setSubmitting(false)
        } catch (serverError) {
            setSubmitting(false)
        }
    }

    return (
        <GridContainer>
            <UswdsForm
                className={styles.formContainer}
                id="AddQuestionsForm"
                aria-label="Add Questions Form"
                aria-describedby="form-guidance"
                onSubmit={(e) => console.log('ah')}
            >
                <fieldset className="usa-fieldset">
                    <legend>Add questions</legend>
                    <h2>Add questions</h2>
                    <p>{`Questions from ${division?.toUpperCase()}`}</p>

                    <FormGroup error={showFileUploadError}>
                        <FileUpload
                            id="documents"
                            name="documents"
                            label="Upload contract"
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
                                        Document definitions and requirements
                                    </Link>
                                    <span>
                                        This input only accepts PDF, CSV, DOC,
                                        DOCX, XLS, XLSX, XLSM files.
                                    </span>
                                </>
                            }
                            accept={ACCEPTED_SUBMISSION_FILE_TYPES}
                            uploadFile={handleUploadFile}
                            scanFile={handleScanFile}
                            deleteFile={handleDeleteFile}
                            onFileItemsUpdate={onFileItemsUpdate}
                        />
                    </FormGroup>
                </fieldset>
                <PageActions
                    backOnClick={async () => {
                        // do not need to validate or resubmit if no documents are uploaded
                        // if (fileItems.length === 0) {
                        //     navigate('../type')
                        // } else {
                            // await handleFormSubmit( )
                        }
                    }
                    disableContinue={showFileUploadError}
                    actionInProgress={isSubmitting}
                />
            </UswdsForm>
        </GridContainer>
    )
}
