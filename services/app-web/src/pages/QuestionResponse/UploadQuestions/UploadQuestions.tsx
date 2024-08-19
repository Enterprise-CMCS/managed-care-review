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
    CreateQuestionInput,
    useCreateQuestionMutation,
} from '../../../gen/gqlClient'
import { SideNavOutletContextType } from '../../SubmissionSideNav/SubmissionSideNav'
import { usePage } from '../../../contexts/PageContext'
import { Breadcrumbs } from '../../../components/Breadcrumbs/Breadcrumbs'
import { createQuestionWrapper } from '../../../gqlHelpers/mutationWrappersForUserFriendlyErrors'
import { RoutesRecord } from '../../../constants'
import { GenericErrorPage } from '../../Errors/GenericErrorPage'

export const UploadQuestions = () => {
    // router context
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    const { division, id } = useParams<{ division: string; id: string }>()
    const navigate = useNavigate()
    const { packageName, pkg } = useOutletContext<SideNavOutletContextType>()

    // api
    const [createQuestion, { loading: apiLoading, error: apiError }] =
        useCreateQuestionMutation()

    // page level state
    const [shouldValidate, setShouldValidate] = React.useState(false)
    const { updateHeading } = usePage()
    useEffect(() => {
        updateHeading({ customHeading: `${packageName} Add questions` })
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

        if (pkg.status === 'DRAFT') {
            return <GenericErrorPage />
        }
    const showFileUploadError = Boolean(shouldValidate && fileUploadError)
    const fileUploadErrorFocusKey = hasNoFiles
        ? 'questions-upload'
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
        const questionDocs = cleaned.map((item) => {
            return {
                name: item.name,
                s3URL: item.s3URL as string,
            }
        })

        const input: CreateQuestionInput = {
            contractID: id as string,
            documents: questionDocs,
        }

        const createResult = await createQuestionWrapper(createQuestion, input)

        if (createResult instanceof Error) {
            console.info(createResult.message)
        } else {
            navigate(`/submissions/${id}/question-and-answers?submit=question`)
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
                        text: 'Add questions',
                        link: RoutesRecord.SUBMISSIONS_UPLOAD_QUESTION,
                    },
                ]}
            />

            <UswdsForm
                className={styles.formContainer}
                id="AddQuestionsForm"
                aria-label="Add Questions Form"
                aria-describedby="form-guidance"
                onSubmit={async (e) => {
                    e.preventDefault()
                    await handleFormSubmit()
                }}
            >
                {apiError && <GenericApiErrorBanner />}
                <fieldset className="usa-fieldset">
                    <h2>Add questions</h2>
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
                            id="questions-upload"
                            name="questions-upload"
                            label="Upload questions"
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
                            link_url={`/submissions/${id}/question-and-answers?submit=question`}
                            disabled={showFileUploadError}
                            animationTimeout={1000}
                            loading={apiLoading}
                        >
                            Add questions
                        </ActionButton>
                    </ButtonGroup>
                </PageActionsContainer>
            </UswdsForm>
        </GridContainer>
    )
}
