import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import styles from '../QuestionResponse.module.scss'
import {
    CreateContractQuestionInput,
    useCreateContractQuestionMutation,
    useFetchContractWithQuestionsQuery,
} from '../../../gen/gqlClient'
import { usePage } from '../../../contexts/PageContext'
import { Breadcrumbs } from '../../../components/Breadcrumbs/Breadcrumbs'
import { createContractQuestionWrapper } from '@mc-review/helpers'
import { RoutesRecord } from '@mc-review/constants'
import { GenericErrorPage } from '../../Errors/GenericErrorPage'
import { UploadQuestionsForm } from './UploadQuestionsForm'
import { FileItemT } from '../../../components'
import { getNextCMSRoundNumber } from '../QuestionResponseHelpers'
import { ErrorOrLoadingPage } from '../../StateSubmission'
import { handleAndReturnErrorState } from '../../StateSubmission/ErrorOrLoadingPage'
import { isValidCmsDivison } from '../QuestionResponseHelpers/questionResponseHelpers'
import { Error404 } from '../../Errors/Error404Page'

export const UploadContractQuestions = () => {
    // router context
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    const { updateHeading } = usePage()
    const { id, division } = useParams<{ division: string; id: string }>()
    const navigate = useNavigate()

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

    const [createQuestion, { loading: apiLoading, error: apiError }] =
        useCreateContractQuestionMutation()

    const contract = fetchContractData?.fetchContract.contract
    const contractName =
        (contract?.packageSubmissions &&
            contract?.packageSubmissions[0].contractRevision.contractName) ||
        ''
    // side effects
    useEffect(() => {
        updateHeading({ customHeading: `${contractName} Add questions` })
    }, [contractName, updateHeading])

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
        !contract.questions ||
        !division
    ) {
        return <GenericErrorPage />
    }

    const handleFormSubmit = async (cleaned: FileItemT[]) => {
        const questionDocs = cleaned.map((item) => {
            return {
                name: item.name,
                s3URL: item.s3URL as string,
            }
        })

        const input: CreateContractQuestionInput = {
            contractID: id as string,
            documents: questionDocs,
        }

        const createResult = await createContractQuestionWrapper(
            createQuestion,
            input
        )

        if (createResult instanceof Error) {
            console.info(createResult.message)
        } else {
            navigate(`/submissions/${id}/question-and-answers?submit=question`)
        }
    }

    // confirm division is valid
    const realDivision = division?.toUpperCase()

    if (!realDivision || !isValidCmsDivison(realDivision)) {
        console.error(
            'Upload Questions called with bogus division in URL: ',
            division
        )
        return <Error404 />
    }

    const nextRoundNumber = getNextCMSRoundNumber(
        contract.questions,
        realDivision
    )

    return (
        <div className={styles.uploadFormContainer}>
            <Breadcrumbs
                className="usa-breadcrumb--wrap"
                items={[
                    {
                        link: RoutesRecord.DASHBOARD_SUBMISSIONS,
                        text: 'Dashboard',
                    },
                    { link: `/submissions/${id}`, text: contractName },
                    {
                        text: 'Add questions',
                        link: RoutesRecord.SUBMISSIONS_UPLOAD_CONTRACT_QUESTION,
                    },
                ]}
            />

            <UploadQuestionsForm
                apiLoading={apiLoading}
                apiError={Boolean(apiError)}
                type="contract"
                handleSubmit={handleFormSubmit}
                round={nextRoundNumber}
                division={realDivision}
                id={contract.id}
            />
        </div>
    )
}
