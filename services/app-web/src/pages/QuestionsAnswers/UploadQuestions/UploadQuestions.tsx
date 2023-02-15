import React, { useState } from 'react'
import { GridContainer, Form as UswdsForm, FormGroup,ButtonGroup } from '@trussworks/react-uswds'
import styles from '../../StateSubmission/StateSubmissionForm.module.scss'
import { useNavigate, useParams } from 'react-router-dom'
import { useS3 } from '../../../contexts/S3Context'
import { ActionButton, ErrorSummary,  FileUpload } from '../../../components'
import { useFileUpload } from '../../../hooks/useFileUpload'
import { ACCEPTED_SUBMISSION_FILE_TYPES } from '../../../components/FileUpload'
import { PageActionsContainer } from '../../StateSubmission/PageActions'
import { useErrorSummary } from '../../../hooks/useErrorSummary'

export const UploadQuestions = () => {
    // third party 
    const { division, id } = useParams<{ division: string; id: string }>()
    const navigate = useNavigate()

    // page level state
    const [shouldValidate, setShouldValidate] = React.useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // component specific support 
    const { handleDeleteFile, handleUploadFile, handleScanFile } = useS3()
    const {
        hasValidFiles,
        hasNoFiles,
        onFileItemsUpdate,
        fileUploadErrorMessage,
        cleanFileItemsBeforeSave
    } = useFileUpload(shouldValidate)
    const { setFocusErrorSummaryHeading, errorSummaryHeadingRef } = useErrorSummary()
    const showFileUploadError = shouldValidate && !hasValidFiles
    const fileUploadErrorFocusKey=
        hasNoFiles ? 'questions-upload' : '#file-items-list'


   const handleFormSubmit = async () => {
        // Currently documents validation happens (outside of the yup schema, which only handles the formik form data)
        // if there are any errors present in the documents list and we are in a validation state (relevant for Save as Draft) force user to clear validations to continue
            if (!hasValidFiles) {
                setShouldValidate(true)
                setFocusErrorSummaryHeading(true)
                setIsSubmitting(false)
                return
            }

        try {
            const cleaned = cleanFileItemsBeforeSave()
            const questionDocs = cleaned.map((item) => { return {
                    name: item.name,
                    s3URL: item.s3URL,
    
                }})
            
                const updatedSubmission = await createQuestion(cleaned)
                if (updatedSubmission instanceof Error) {
                    setIsSubmitting(false)
                    console.info(
                        'Error creating Question ',
                    )
                } else if (updatedSubmission) {
                    navigate(`/submissions/${id}/question-and-answers`)
                }
            setIsSubmitting(false)
        } catch (serverError) {
            setIsSubmitting(false)
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
                    <h2>Add questions</h2>
                    <p className="text-bold">{`Questions from ${division?.toUpperCase()}`}</p>

                    {shouldValidate && (
                        <ErrorSummary
                            errors={
                                showFileUploadError && fileUploadErrorMessage
                                    ? {
                                          [fileUploadErrorFocusKey]:
                                              fileUploadErrorMessage,
                                      }
                                    : {}
                            }
                            headingRef={errorSummaryHeadingRef}
                        />
                    )}

                    <FormGroup error={showFileUploadError}>
                        <FileUpload
                            id="questions-upload"
                            name="questions-upload"
                            label="Upload questions"
                            renderMode="list"
                            aria-required
                            error={
                                showFileUploadError
                                    ? fileUploadErrorMessage
                                    : ''
                            }
                            hint={
                                <span>
                                    This input only accepts PDF, CSV, DOC, DOCX,
                                    XLS, XLSX, XLSM files.
                                </span>
                            }
                            accept={ACCEPTED_SUBMISSION_FILE_TYPES}
                            uploadFile={handleUploadFile}
                            scanFile={handleScanFile}
                            deleteFile={handleDeleteFile}
                            onFileItemsUpdate={onFileItemsUpdate}
                        />
                    </FormGroup>
                </fieldset>
                <PageActionsContainer>
                    <ButtonGroup type="default">
                        <ActionButton
                            type="button"
                            variant="outline"
                            data-testid="page-actions-left-secondary"
                            disabled={isSubmitting}
                            onClick={async () => {
                                return isSubmitting
                                    ? undefined
                                    : navigate(
                                          `/submissions/${id}/question-and-answers`
                                      )
                            }}
                        >
                            Cancel
                        </ActionButton>

                        <ActionButton
                            type="submit"
                            variant="default"
                            data-testid="page-actions-right-primary"
                            disabled={showFileUploadError}
                            onClick={async () => {
                                return isSubmitting || showFileUploadError
                                    ? undefined
                                    : await handleFormSubmit
                            }}
                            animationTimeout={1000}
                            loading={isSubmitting && !showFileUploadError}
                        >
                            Add questions
                        </ActionButton>
                    </ButtonGroup>
                </PageActionsContainer>
            </UswdsForm>
        </GridContainer>
    )
}
