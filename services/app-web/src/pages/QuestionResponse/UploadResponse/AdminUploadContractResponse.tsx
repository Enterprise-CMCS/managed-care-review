import { useEffect, useLayoutEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@apollo/client/react'
import {
    StateUser,
    AdminCreateContractQuestionResponseInput,
    AdminCreateContractQuestionResponseDocument,
    FetchContractWithQuestionsDocument,
    IndexUsersDocument,
} from '../../../gen/gqlClient'
import styles from '../QuestionResponse.module.scss'
import { usePage } from '../../../contexts/PageContext'
import { useAuth } from '../../../contexts/AuthContext'
import { Breadcrumbs } from '../../../components'
import { RoutesRecord } from '@mc-review/constants'
import { GenericErrorPage } from '../../Errors/GenericErrorPage'
import {
    AdminUploadResponseForm,
    AdminUploadResponseFormData,
} from './AdminUploadResponseForm'
import { ErrorOrLoadingPage } from '../../StateSubmission'
import { handleAndReturnErrorState } from '../../StateSubmission/SharedSubmissionComponents'
import { extractQuestions } from '../QuestionResponseHelpers/questionResponseHelpers'
import { useMemoizedStateHeader } from '../../../hooks'

// Admin-only page for recording a response on an existing contract question.
// Fetches the data the form needs and turns the submitted values into the
// GraphQL mutation; the form itself lives in AdminUploadResponseForm.
export const AdminUploadContractResponse = () => {
    const { id, questionID, contractSubmissionType } = useParams<{
        id: string
        questionID: string
        contractSubmissionType: string
    }>()

    const navigate = useNavigate()
    const { updateHeading, updateActiveMainContent } = usePage()
    const { loggedInUser } = useAuth()

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

    const { data: indexUsersData } = useQuery(IndexUsersDocument)

    const [createResponse, { loading: apiLoading, error: apiError }] =
        useMutation(AdminCreateContractQuestionResponseDocument)

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
        updateActiveMainContent('contractAdminAddResponseForm')
    }, [updateActiveMainContent])

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

    const baseQARedirectURL = `/submissions/${contractSubmissionType}/${id}/question-and-answers`

    const question = extractQuestions(contract.questions).find(
        (q) => q.id == questionID
    )

    // State users on this contract's state an admin can record on behalf of.
    const stateUsers = (indexUsersData?.indexUsers.edges ?? [])
        .map((edge) => edge.node)
        .filter(
            (node): node is StateUser =>
                node.__typename === 'StateUser' &&
                node.state.code === contract.state.code
        )

    const handleFormSubmit = async (data: AdminUploadResponseFormData) => {
        const responseDocs = data.documents.map((item) => ({
            name: item.name,
            s3URL: item.s3URL as string,
        }))

        const input: AdminCreateContractQuestionResponseInput = {
            questionID: questionID as string,
            addedByUserID: data.addedByUserID,
            reason: data.reason.trim(),
            documents: responseDocs,
        }

        if (data.createdAt) {
            input.createdAt = data.createdAt
        }

        try {
            await createResponse({
                variables: { input },
                refetchQueries: [FetchContractWithQuestionsDocument],
            })
            navigate(`${baseQARedirectURL}?submit=response`)
        } catch (err) {
            // apiError banner is rendered from the mutation error state
            console.info(err)
        }
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
                        text: 'Upload response',
                        link: RoutesRecord.SUBMISSIONS_ADMIN_UPLOAD_CONTRACT_RESPONSE,
                    },
                ]}
            />

            <AdminUploadResponseForm
                handleSubmit={handleFormSubmit}
                apiLoading={apiLoading}
                apiError={Boolean(apiError)}
                contract={contract}
                question={question}
                stateUsers={stateUsers}
                loggedInUser={loggedInUser}
            />
        </div>
    )
}
