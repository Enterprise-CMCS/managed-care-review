import React, { useEffect } from 'react'
import {
    GridContainer,
    Form as UswdsForm,
    FormGroup,
    ButtonGroup,
} from '@trussworks/react-uswds'
import styles from '../QuestionResponse.module.scss'
import { useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { useS3 } from '../../../contexts/S3Context'
import {
    ActionButton,
    ErrorSummary,
    FileUpload,
    GenericApiErrorBanner,
} from '../../../components'
import { useFileUpload } from '../../../hooks/useFileUpload'
import { ACCEPTED_SUBMISSION_FILE_TYPES } from '../../../components/FileUpload'
import { PageActionsContainer } from '../../StateSubmission/PageActions'
import { useErrorSummary } from '../../../hooks/useErrorSummary'
import {
    CreateQuestionResponseInput,
    useCreateQuestionResponseMutation,
    Division,
} from '../../../gen/gqlClient'
import { usePage } from '../../../contexts/PageContext'
import { SideNavOutletContextType } from '../../SubmissionSideNav/SubmissionSideNav'
import { Breadcrumbs } from '../../../components/Breadcrumbs/Breadcrumbs'
import { createResponseWrapper } from '../../../gqlHelpers/mutationWrappersForUserFriendlyErrors'
import { RoutesRecord } from '../../../constants'

export const UploadResponse = () => {
    // router context
    const { division, id, questionID } = useParams<{
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        division: string
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        id: string
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        questionID: string
    }>()
    const navigate = useNavigate()

    // api
    const [createResponse, { loading: apiLoading, error: apiError }] =
        useCreateQuestionResponseMutation()

    // page level state
    const [shouldValidate, setShouldValidate] = React.useState(false)
    const { updateHeading } = usePage()
    const { packageName } = useOutletContext<SideNavOutletContextType>()
    useEffect(() => {
        updateHeading({ customHeading: packageName })
    }, [packageName, updateHeading])

    // component specific support
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
    const showFileUploadError = Boolean(shouldValidate && fileUploadError)
    const fileUploadErrorFocusKey = hasNoFiles
        ? 'response-upload'
        : '#file-items-list'

    const handleFormSubmit = async () => {
        // Currently documents validation happens (outside of the yup schema, which only handles the formik form data)
        // if there are any errors present in the documents list and we are in a validation state (relevant for Save as Draft) force user to clear validations to continue
        if (!hasValidFiles || hasNoFiles) {
            setShouldValidate(true)
            setFocusErrorSummaryHeading(true)
            return
        }

        const cleaned = cleanFileItemsBeforeSave()
        const responseDocs = cleaned.map((item) => {
            return {
                name: item.name,
                s3URL: item.s3URL as string,
            }
        })

        const input: CreateQuestionResponseInput = {
            questionID: questionID as string,
            documents: responseDocs,
        }

        const createResult = await createResponseWrapper(
            createResponse,
            id as string,
            input,
            division as Division
        )

        if (createResult instanceof Error) {
            console.info(createResult.message)
        } else {
            navigate(`/submissions/${id}/question-and-answers?submit=response`)
        }
    }

    return (
        <GridContainer>
            <Breadcrumbs
                items={[
                    {
                        link: RoutesRecord.DASHBOARD_SUBMISSIONS,
                        text: 'Dashboard',
                    },
                    { link: `/submissions/${id}`, text: packageName },
                    {
                        text: 'Add response',
                        link: RoutesRecord.SUBMISSIONS_UPLOAD_RESPONSE,
                    },
                ]}
            />

            <UswdsForm
                className={styles.formContainer}
                id="AddQuestionResponseForm"
                aria-label="Add Response"
                aria-describedby="form-guidance"
                onSubmit={async (e) => {
                    e.preventDefault()
                    await handleFormSubmit()
                }}
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
                            id="response-upload"
                            name="response-upload"
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
                            onClick={() => {
                                navigate(
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
                            animationTimeout={1000}
                            loading={apiLoading}
                        >
                            Send response
                        </ActionButton>
                    </ButtonGroup>
                </PageActionsContainer>
            </UswdsForm>
        </GridContainer>
    )
}
