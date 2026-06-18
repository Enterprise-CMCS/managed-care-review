import { useEffect, useLayoutEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@apollo/client/react'
import styles from '../QuestionResponse.module.scss'
import {
    ContractSubmissionType,
    Division,
    CmsUser,
    CmsApproverUser,
    AdminCreateContractQuestionInput,
    AdminCreateContractQuestionDocument,
    FetchContractWithQuestionsDocument,
    IndexUsersDocument,
} from '../../../gen/gqlClient'
import { usePage } from '../../../contexts/PageContext'
import { useAuth } from '../../../contexts/AuthContext'
import { useLDClient } from 'launchdarkly-react-client-sdk'
import { featureFlags } from '@mc-review/common-code'
import { Breadcrumbs } from '../../../components'
import { RoutesRecord } from '@mc-review/constants'
import { GenericErrorPage } from '../../Errors/GenericErrorPage'
import {
    AdminUploadQuestionsForm,
    AdminUploadQuestionsFormData,
} from './AdminUploadQuestionsForm'
import { ErrorOrLoadingPage } from '../../StateSubmission'
import { handleAndReturnErrorState } from '../../StateSubmission/SharedSubmissionComponents'
import { useMemoizedStateHeader } from '../../../hooks'

// Admin-only page for recording a question on a submitted contract. Fetches the
// data the form needs and turns the submitted values into the GraphQL mutation;
// the form itself lives in AdminUploadQuestionsForm.
export const AdminUploadContractQuestions = () => {
    const { updateHeading, updateActiveMainContent } = usePage()
    const { id, contractSubmissionType } = useParams<{
        id: string
        contractSubmissionType: ContractSubmissionType
    }>()
    const navigate = useNavigate()
    const { loggedInUser } = useAuth()
    const ldClient = useLDClient()
    const adminOnlyQaRounds: boolean = ldClient?.variation(
        featureFlags.ADMIN_ONLY_QA_ROUNDS.flag,
        featureFlags.ADMIN_ONLY_QA_ROUNDS.defaultValue
    )

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

    const [createQuestion, { loading: apiLoading, error: apiError }] =
        useMutation(AdminCreateContractQuestionDocument)

    // CMS users (and approvers) an admin can ask on behalf of.
    const cmsUsers = (indexUsersData?.indexUsers.edges ?? [])
        .map((edge) => edge.node)
        .filter(
            (node): node is CmsUser | CmsApproverUser =>
                node.__typename === 'CMSUser' ||
                node.__typename === 'CMSApproverUser'
        )

    const contract = fetchContractData?.fetchContract.contract
    const contractName =
        (contract?.packageSubmissions &&
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
        updateActiveMainContent('contractAdminAddQuestionsForm')
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

    if (!contract || contract.status === 'DRAFT' || !contract.questions) {
        return <GenericErrorPage />
    }

    const baseQARedirectURL = `/submissions/${contractSubmissionType}/${id}/question-and-answers`

    const handleFormSubmit = async (data: AdminUploadQuestionsFormData) => {
        const questionDocs = data.documents.map((item) => ({
            name: item.name,
            s3URL: item.s3URL as string,
        }))

        const input: AdminCreateContractQuestionInput = {
            contractID: id as string,
            reason: data.reason.trim(),
            documents: questionDocs,
        }

        if (data.addedByUserID && data.addedByUserID !== 'myself') {
            input.addedByUserID = data.addedByUserID
        }
        if (data.division) {
            input.division = data.division as Division
        }
        if (data.createdAt) {
            input.createdAt = data.createdAt
        }

        try {
            await createQuestion({ variables: { input } })
            navigate(`${baseQARedirectURL}?submit=question`)
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
                        text: 'Add questions',
                        link: RoutesRecord.SUBMISSIONS_ADMIN_UPLOAD_CONTRACT_QUESTION,
                    },
                ]}
            />

            <AdminUploadQuestionsForm
                handleSubmit={handleFormSubmit}
                apiLoading={apiLoading}
                apiError={Boolean(apiError)}
                contract={contract}
                cmsUsers={cmsUsers}
                loggedInUser={loggedInUser}
                adminOnlyQaRounds={adminOnlyQaRounds}
            />
        </div>
    )
}
