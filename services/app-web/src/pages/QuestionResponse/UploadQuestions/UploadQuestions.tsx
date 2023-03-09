import React from 'react'
import {
    GridContainer,
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
import { ACCEPTED_SUBMISSION_FILE_TYPES } from '../../../components/FileUpload'
import { PageActionsContainer } from '../../StateSubmission/PageActions'
import { useErrorSummary } from '../../../hooks/useErrorSummary'
import {
    CreateQuestionInput,
    useCreateQuestionMutation,
    FetchHealthPlanPackageWithQuestionsDocument,
    FetchHealthPlanPackageWithQuestionsQuery,
} from '../../../gen/gqlClient'

export const UploadQuestions = () => {
    // third party
    const { division, id } = useParams<{ division: string; id: string }>()
    const navigate = useNavigate()

    // api
    const [createQuestion, { loading: apiLoading, error: apiError }] =
        useCreateQuestionMutation()

    // page level state
    const [shouldValidate, setShouldValidate] = React.useState(false)

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

        try {
            const cleaned = cleanFileItemsBeforeSave()
            const questionDocs = cleaned.map((item) => {
                return {
                    name: item.name,
                    s3URL: item.s3URL as string,
                }
            })

            const input: CreateQuestionInput = {
                pkgID: id as string,
                documents: questionDocs,
            }

            const createResult = await createQuestion({
                variables: { input },
                update(cache, { data }) {
                    if (data) {
                        const newQuestion = data.createQuestion.question
                        const result =
                            cache.readQuery<FetchHealthPlanPackageWithQuestionsQuery>(
                                {
                                    query: FetchHealthPlanPackageWithQuestionsDocument,
                                    variables: {
                                        input: {
                                            pkgID: newQuestion.pkgID,
                                        },
                                    },
                                }
                            )

                        const pkg = result?.fetchHealthPlanPackage.pkg

                        if (pkg) {
                            cache.evict({ id: cache.identify(pkg) })
                            cache.gc()
                        }
                    }
                },
            })

            if (createResult) {
                navigate(`/submissions/${id}/question-and-answers`)
            }
        } catch (serverError) {
            console.info(serverError)
        }
    }

    return (
        <GridContainer>
            <UswdsForm
                className={styles.formContainer}
                id="AddQuestionsForm"
                aria-label="Add Questions Form"
                aria-describedby="form-guidance"
                onSubmit={() => {
                    return
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
                            renderMode="list"
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
                            onClick={async () => {
                                return apiLoading
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
                            onClick={async (e) => {
                                e.preventDefault()
                                await handleFormSubmit()
                            }}
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
