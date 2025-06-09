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
import {
    ACCEPTED_SUBMISSION_FILE_TYPES,
    FileItemT,
} from '../../../components/FileUpload'
import { PageActionsContainer } from '../../StateSubmission/PageActions'
import { useErrorSummary } from '../../../hooks/useErrorSummary'
import { Division } from '../../../gen/gqlClient'
import { QAUploadFormSummary } from '../QAUploadFormSummary'

type UploadResponseFormProps = {
    handleSubmit: (cleaned: FileItemT[]) => Promise<void>
    apiLoading: boolean
    apiError: boolean
    type: 'contract' | 'rate'
    round: number
    questionBeingAsked?: JSX.Element // pass in a QuestionDisplayTable with data
}
const UploadResponseForm = ({
    handleSubmit,
    apiError,
    apiLoading,
    type,
    round,
    questionBeingAsked,
}: UploadResponseFormProps) => {
    const { division, id, rateID } = useParams<{
        division: string
        id: string
        rateID: string
    }>()
    const [shouldValidate, setShouldValidate] = React.useState(false)
    const navigate = useNavigate()
    const { handleUploadFile, handleScanFile } = useS3()
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

    const cancelLink =
        type === 'contract'
            ? `/submissions/${id}/question-and-answers`
            : `/submissions/${id}/rates/${rateID}/question-and-answers`
    const submitLink =
        type === 'contract'
            ? `/submissions/${id}/question-and-answers?submit=response`
            : `/submissions/${id}/rates/${rateID}/question-and-answers?submit=response`

    const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
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

    const fileUploadHint =
        type === 'contract' ? (
            <span>
                This input only accepts PDF, CSV, DOC, DOCX, XLS, XLSX, XLSM
                files.
            </span>
        ) : (
            <span>
                You must submit the response in a DOC or DOCX format.
                <br />
                Appendices to the responses can be in PDF, CSV, DOC, DOCX, XLS,
                XLSX files.
            </span>
        )

    const isContract = type == 'contract'
    return (
        <UswdsForm
            className={styles.formContainer}
            id={`${type}AddQuestionsResponseForm`}
            aria-label="Add Response Form"
            aria-describedby={`${type}AddQuestionsResponseForm`}
            onSubmit={onSubmit}
        >
            {apiError && <GenericApiErrorBanner />}
            <fieldset className="usa-fieldset">
                <h2>Upload response</h2>
                <QAUploadFormSummary
                    // Don't pass a round for rates - we don't display rounds to state users on rates
                    round={isContract ? round : undefined}
                    division={division?.toUpperCase() as Division}
                    isContract={isContract}
                />
                {questionBeingAsked}

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
                        hint={fileUploadHint}
                        accept={ACCEPTED_SUBMISSION_FILE_TYPES}
                        uploadFile={(file) =>
                            handleUploadFile(file, 'QUESTION_ANSWER_DOCS')
                        }
                        scanFile={(key) =>
                            handleScanFile(key, 'QUESTION_ANSWER_DOCS')
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
                        link_url={cancelLink}
                        onClick={() => {
                            navigate(cancelLink)
                        }}
                    >
                        Cancel
                    </ActionButton>

                    <ActionButton
                        type="submit"
                        variant="default"
                        data-testid="page-actions-right-primary"
                        parent_component_type="page body"
                        link_url={submitLink}
                        disabled={showFileUploadError}
                        animationTimeout={1000}
                        loading={apiLoading}
                    >
                        Submit response
                    </ActionButton>
                </ButtonGroup>
            </PageActionsContainer>
        </UswdsForm>
    )
}

export { UploadResponseForm }
