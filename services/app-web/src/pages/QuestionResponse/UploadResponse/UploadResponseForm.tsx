import React from 'react'
import {
    Form as UswdsForm,
    FormGroup,
    ButtonGroup,
} from '@trussworks/react-uswds'
import styles from '../QuestionResponse.module.scss'
import { useNavigate, useParams } from 'react-router-dom'
import { useS3 } from '../../../contexts/S3Context'
import {
    ActionButton,
    ErrorSummary,
    FileUpload,
    GenericApiErrorBanner,
} from '../../../components'
import { useFileUpload } from '../../../hooks/useFileUpload'
import { ACCEPTED_SUBMISSION_FILE_TYPES, FileItemT } from '../../../components/FileUpload'
import { PageActionsContainer } from '../../StateSubmission/PageActions'
import { useErrorSummary } from '../../../hooks/useErrorSummary'

type UploadResponseFormProps =  {
    handleSubmit: (cleaned: FileItemT[]) => Promise<void>,
    apiLoading: boolean,
    apiError: boolean,
    type: 'contract' | 'rate'

}
const UploadResponseForm = ({handleSubmit, apiError, apiLoading, type}: UploadResponseFormProps) => {
    const { division, id } = useParams<{ division: string; id: string }>()
    const [shouldValidate, setShouldValidate] = React.useState(false)
    const navigate = useNavigate()
        const { handleDeleteFile, handleUploadFile, handleScanFile } = useS3()
        const {
            hasValidFiles,
            hasNoFiles,
            onFileItemsUpdate,
            fileUploadError,
            cleanFileItemsBeforeSave,
        } = useFileUpload(shouldValidate)
        const { setFocusErrorSummaryHeading, errorSummaryHeadingRef } =
            useErrorSummary()

        const uploadComponentID = `${type}-response-upload`
        const showFileUploadError = Boolean(shouldValidate && fileUploadError)
        const fileUploadErrorFocusKey = hasNoFiles
            ? uploadComponentID
            : '#file-items-list'

        const onSubmit = async(e: React.FormEvent<HTMLFormElement>) => {
                e.preventDefault()
            // Currently documents validation happens (outside of the yup schema, which only handles the formik form data)
            // if there are any errors present in the documents list and we are in a validation state (relevant for Save as Draft) force user to clear validations to continue
            if (!hasValidFiles || hasNoFiles) {
                setShouldValidate(true)
                setFocusErrorSummaryHeading(true)
                return
            } else {
                const cleaned = cleanFileItemsBeforeSave()
                return await handleSubmit(cleaned)
            }
        }

    return (
        <UswdsForm
                className={styles.formContainer}
                id={`${type}AddQuestionsResponseForm`}
                aria-label="Add Response Form"
                aria-describedby="form-guidance"
                onSubmit={onSubmit}
            >
                {apiError && <GenericApiErrorBanner />}
                <fieldset className="usa-fieldset">
                    <h2>New response</h2>
                    <p className="text-bold">{`Questions from ${division?.toUpperCase()}`}</p>

                    {shouldValidate && (
                        <ErrorSummary
                            errors={
                                showFileUploadError && fileUploadError
                                    ? {
                                          [fileUploadErrorFocusKey]:
                                              fileUploadError,
                                      }
                                    : {}
                            }
                            headingRef={errorSummaryHeadingRef}
                        />
                    )}

                    <FormGroup error={showFileUploadError}>
                        <FileUpload
                            id={uploadComponentID}
                            name={uploadComponentID}
                            label="Upload response"
                            aria-required
                            error={showFileUploadError ? fileUploadError : ''}
                            hint={
                                <span>
                                    This input only accepts PDF, CSV, DOC, DOCX,
                                    XLS, XLSX, XLSM files.
                                </span>
                            }
                            accept={ACCEPTED_SUBMISSION_FILE_TYPES}
                            uploadFile={(file) =>
                                handleUploadFile(file, 'QUESTION_ANSWER_DOCS')
                            }
                            scanFile={(key) =>
                                handleScanFile(key, 'QUESTION_ANSWER_DOCS')
                            }
                            deleteFile={(key) =>
                                handleDeleteFile(key, 'QUESTION_ANSWER_DOCS')
                            }
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
                            disabled={apiLoading}
                            parent_component_type="page body"
                            link_url={`/submissions/${id}/question-and-answers`}
                            onClick={() =>
                                navigate(
                                    `/submissions/${id}/question-and-answers`
                                )
                            }
                        >
                            Cancel
                        </ActionButton>

                        <ActionButton
                            type="submit"
                            variant="default"
                            data-testid="page-actions-right-primary"
                            parent_component_type="page body"
                            link_url={`/submissions/${id}/question-and-answers?submit=reponse`}
                            disabled={showFileUploadError}
                            animationTimeout={1000}
                            loading={apiLoading}
                        >
                            Send Response
                        </ActionButton>
                    </ButtonGroup>
                </PageActionsContainer>
            </UswdsForm>
    )
}

export {UploadResponseForm}