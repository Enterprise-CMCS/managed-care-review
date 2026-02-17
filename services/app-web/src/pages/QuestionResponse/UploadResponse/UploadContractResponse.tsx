import { useEffect, useLayoutEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
    CreateQuestionResponseInput,
    useCreateContractQuestionResponseMutation,
    useFetchContractWithQuestionsQuery,
} from '../../../gen/gqlClient'
import styles from '../QuestionResponse.module.scss'
import { usePage } from '../../../contexts/PageContext'
import { Breadcrumbs } from '../../../components'
import { createContractResponseWrapper } from '@mc-review/helpers'
import { RoutesRecord } from '@mc-review/constants'
import { GenericErrorPage } from '../../Errors/GenericErrorPage'
import { UploadResponseForm } from './UploadResponseForm'
import { FileItemT } from '../../../components'
import {
    extractDocumentsFromQuestion,
    extractQuestions,
    getQuestionRoundForQuestionID,
    isValidCmsDivison,
} from '../QuestionResponseHelpers/questionResponseHelpers'
import { ErrorOrLoadingPage } from '../../StateSubmission'
import { handleAndReturnErrorState } from '../../StateSubmission/SharedSubmissionComponents'
import { QuestionDisplayTable } from '../QATable/QuestionDisplayTable'
import { useAuth } from '../../../contexts/AuthContext'
import { Error404 } from '../../Errors/Error404Page'
import { useMemoizedStateHeader } from '../../../hooks'
import { aC } from 'vitest/dist/chunks/reporters.d.BFLkQcL6.js'

export const UploadContractResponse = () => {
    // router context
    const { division, id, questionID, contractSubmissionType } = useParams<{
        division: string
        id: string
        questionID: string
        contractSubmissionType: string
    }>()

    const navigate = useNavigate()
    const { updateHeading, updateActiveMainContent } = usePage()
    const { loggedInUser } = useAuth()
    // api
    const {
        data: fetchContractData,
        loading: fetchContractLoading,
        error: fetchContractError,
    } = useFetchContractWithQuestionsQuery({
        variables: {
            input: {
                contractID: id || 'not-found',
            },
        },
    })

    const [createResponse, { loading: apiLoading, error: apiError }] =
        useCreateContractQuestionResponseMutation()

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

    // side effects
    useLayoutEffect(() => {
        updateHeading({ customHeading: stateHeader })
    }, [stateHeader, updateHeading])

    const activeMainContentId = 'contractResponsePageMainContent'

    // Set the active main content to focus when click the Skip to main content button.
    useEffect(() => {
        updateActiveMainContent(activeMainContentId)
    }, [activeMainContentId, updateActiveMainContent])

    // confirm division is valid
    const realDivision = division?.toUpperCase()

    if (!realDivision || !isValidCmsDivison(realDivision)) {
        console.error(
            'Upload Questions called with bogus division in URL: ',
            division
        )
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

    const handleFormSubmit = async (cleaned: FileItemT[]) => {
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

        const createResult = await createContractResponseWrapper(
            createResponse,
            id as string,
            input,
            realDivision
        )
        if (createResult instanceof Error) {
            console.info(createResult.message)
        } else {
            navigate(
                `/submissions/${contractSubmissionType}/${id}/question-and-answers?submit=response`
            )
        }
    }
    const question = extractQuestions(contract.questions).find(
        (question) => question.id == questionID
    )
    const questionRound = getQuestionRoundForQuestionID(
        contract.questions,
        realDivision,
        questionID
    )
    return (
        <div id={activeMainContentId} className={styles.uploadFormContainer}>
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
                        link: RoutesRecord.SUBMISSIONS_UPLOAD_CONTRACT_RESPONSE,
                    },
                ]}
            />
            <UploadResponseForm
                handleSubmit={handleFormSubmit}
                apiLoading={apiLoading}
                apiError={Boolean(apiError)}
                type="contract"
                round={questionRound}
                questionBeingAsked={
                    question ? (
                        <QuestionDisplayTable
                            documents={extractDocumentsFromQuestion(question)}
                            user={loggedInUser!}
                            onlyDisplayInitial
                        />
                    ) : (
                        <p>'Related question unable to display'</p>
                    )
                }
            />
        </div>
    )
}
