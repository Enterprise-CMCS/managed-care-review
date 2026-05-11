import React, { useEffect, useLayoutEffect } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@apollo/client/react'
import { ButtonGroup, Form as UswdsForm } from '@trussworks/react-uswds'
import { Formik, FormikErrors } from 'formik'
import * as Yup from 'yup'
import {
    DeleteContractQuestionDocument,
    Division,
    FetchContractWithQuestionsDocument,
} from '../../../gen/gqlClient'
import { deleteContractQuestionWrapper } from '@mc-review/helpers'
import styles from '../QuestionResponse.module.scss'
import { usePage } from '../../../contexts/PageContext'
import {
    ActionButton,
    Breadcrumbs,
    FieldTextarea,
    GenericApiErrorBanner,
    PageActionsContainer,
} from '../../../components'
import { RoutesRecord } from '@mc-review/constants'
import { GenericErrorPage } from '../../Errors/GenericErrorPage'
import {
    extractDocumentsFromQuestion,
    extractQuestions,
    isValidCmsDivison,
} from '../QuestionResponseHelpers/questionResponseHelpers'
import { ErrorOrLoadingPage } from '../../StateSubmission'
import { handleAndReturnErrorState } from '../../StateSubmission/SharedSubmissionComponents'
import { useAuth } from '../../../contexts/AuthContext'
import { Error404 } from '../../Errors/Error404Page'
import { useMemoizedStateHeader } from '../../../hooks'
import { QAUploadFormSummary } from '../QAUploadFormSummary'
import { QuestionDisplayTable } from '../QATable/QuestionDisplayTable'

type DeleteContractQuestionValues = {
    deleteQuestionReason: string
}

type FormError =
    FormikErrors<DeleteContractQuestionValues>[keyof FormikErrors<DeleteContractQuestionValues>]

const deleteContractQuestionSchema = Yup.object().shape({
    deleteQuestionReason: Yup.string().required(
        'You must provide a reason for deleting this question.'
    ),
})

export const DeleteContractQuestion = () => {
    const { division, id, questionID, contractSubmissionType } = useParams<{
        division: string
        id: string
        questionID: string
        contractSubmissionType: string
    }>()

    const navigate = useNavigate()
    const { updateHeading, updateActiveMainContent } = usePage()
    const { loggedInUser } = useAuth()
    const [shouldValidate, setShouldValidate] = React.useState(false)

    const formInitialValues: DeleteContractQuestionValues = {
        deleteQuestionReason: '',
    }

    const showFieldErrors = (error?: FormError): boolean =>
        shouldValidate && Boolean(error)

    const {
        data: fetchContractData,
        loading: fetchContractLoading,
        error: fetchContractError,
    } = useQuery(FetchContractWithQuestionsDocument, {
        variables: {
            input: {
                contractID: id || 'not-found',
            },
        },
    })

    const [deleteQuestionMutation, { loading: apiLoading, error: apiError }] =
        useMutation(DeleteContractQuestionDocument)

    const contract = fetchContractData?.fetchContract.contract
    const contractName =
        (contract?.packageSubmissions &&
            contract?.packageSubmissions?.length > 0 &&
            contract?.packageSubmissions[0].contractRevision.contractName) ||
        ''
    const stateHeader = useMemoizedStateHeader({
        subHeaderText: contractName,
        stateCode: contract?.state.code,
        stateName: contract?.state.name,
        contractType: contract?.contractSubmissionType,
    })

    useLayoutEffect(() => {
        updateHeading({ customHeading: stateHeader })
    }, [stateHeader, updateHeading])

    useEffect(() => {
        updateActiveMainContent('deleteContractQuestionForm')
    }, [updateActiveMainContent])

    if (loggedInUser && loggedInUser.__typename !== 'AdminUser') {
        return <Navigate to={RoutesRecord.DASHBOARD_SUBMISSIONS} replace />
    }

    const realDivision = division?.toUpperCase()
    if (!realDivision || !isValidCmsDivison(realDivision)) {
        return <Error404 />
    }

    if (fetchContractLoading) {
        return <ErrorOrLoadingPage state="LOADING" />
    }

    if (fetchContractError) {
        return (
            <ErrorOrLoadingPage
                state={handleAndReturnErrorState(fetchContractError)}
            />
        )
    }

    if (
        !contract ||
        contract.status === 'DRAFT' ||
        !questionID ||
        !contract.questions
    ) {
        return <GenericErrorPage />
    }

    const question = extractQuestions(contract.questions).find(
        (q) => q.id === questionID
    )

    if (!question) {
        return <GenericErrorPage />
    }

    const cancelLink = `/submissions/${contractSubmissionType}/${id}/question-and-answers`

    const deleteQuestion = async (values: DeleteContractQuestionValues) => {
        const result = await deleteContractQuestionWrapper(
            deleteQuestionMutation,
            id as string,
            {
                questionID: questionID as string,
                reason: values.deleteQuestionReason,
            },
            realDivision as Division
        )

        if (result instanceof Error) {
            console.info(result.message)
            return
        }

        navigate(`${cancelLink}?delete=question`)
    }

    return (
        <div className={styles.questionResponseMiniFormPage}>
            <Breadcrumbs
                className="usa-breadcrumb--wrap"
                items={[
                    {
                        link: RoutesRecord.DASHBOARD_SUBMISSIONS,
                        text: 'Dashboard',
                    },
                    {
                        link: `/submissions/${contractSubmissionType}/${id}`,
                        text: contractName,
                    },
                    {
                        text: 'Delete question',
                        link: RoutesRecord.SUBMISSIONS_DELETE_CONTRACT_QUESTION,
                    },
                ]}
            />
            <Formik
                initialValues={formInitialValues}
                onSubmit={(values) => deleteQuestion(values)}
                validationSchema={deleteContractQuestionSchema}
            >
                {({ handleSubmit, handleChange, errors }) => (
                    <UswdsForm
                        id="contractDeleteQuestionForm"
                        className={styles.formContainer}
                        onSubmit={(e: React.FormEvent<HTMLFormElement>) => {
                            setShouldValidate(true)
                            return handleSubmit(e)
                        }}
                    >
                        {apiError && <GenericApiErrorBanner />}
                        <fieldset className="usa-fieldset">
                            <legend className="srOnly">Delete question</legend>
                            <h2>Delete question</h2>
                            <QAUploadFormSummary
                                round={question.round}
                                division={realDivision as Division}
                                isContract
                            />
                            <QuestionDisplayTable
                                documents={extractDocumentsFromQuestion(
                                    question
                                )}
                                user={loggedInUser!}
                                onlyDisplayInitial={false}
                            />
                            <FieldTextarea
                                label="Reason for deleting this question."
                                name="deleteQuestionReason"
                                id="deleteQuestionReason"
                                data-testid="deleteQuestionReason"
                                onChange={handleChange}
                                aria-required
                                hint="Provide a reason for deleting this question."
                                showError={showFieldErrors(
                                    errors.deleteQuestionReason
                                )}
                            />
                        </fieldset>
                        <PageActionsContainer>
                            <ButtonGroup type="default">
                                <ActionButton
                                    type="button"
                                    variant="outline"
                                    data-testid="page-actions-left-secondary"
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
                                    variant="secondary"
                                    data-testid="page-actions-right-primary"
                                    parent_component_type="page body"
                                    link_url={cancelLink}
                                    animationTimeout={1000}
                                    loading={apiLoading}
                                    disabled={apiLoading}
                                >
                                    Delete question
                                </ActionButton>
                            </ButtonGroup>
                        </PageActionsContainer>
                    </UswdsForm>
                )}
            </Formik>
        </div>
    )
}
