import { useEffect, useLayoutEffect } from 'react'
import styles from '../QuestionResponse.module.scss'
import { useNavigate, useParams } from 'react-router-dom'
import {
    CreateRateQuestionInput,
    useCreateRateQuestionMutation,
    useFetchRateWithQuestionsQuery,
} from '../../../gen/gqlClient'
import { usePage } from '../../../contexts/PageContext'
import { Breadcrumbs } from '../../../components'
import { createRateQuestionWrapper } from '@mc-review/helpers'
import { RoutesRecord } from '@mc-review/constants'
import { UploadQuestionsForm } from './UploadQuestionsForm'
import { FileItemT } from '../../../components'
import { ErrorOrLoadingPage } from '../../StateSubmission'
import { handleAndReturnErrorState } from '../../StateSubmission/SharedSubmissionComponents'
import { GenericErrorPage } from '../../Errors/GenericErrorPage'
import { getNextCMSRoundNumber } from '../QuestionResponseHelpers'
import { isValidCmsDivison } from '../QuestionResponseHelpers/questionResponseHelpers'
import { Error404 } from '../../Errors/Error404Page'
import { useMemoizedStateHeader } from '../../../hooks'

export const UploadRateQuestions = () => {
    const { updateHeading, updateActiveMainContent } = usePage()
    const { id, division, contractSubmissionType } = useParams<{
        division: string
        id: string
        rateID: string
        contractSubmissionType: string
    }>()
    const navigate = useNavigate()

    // api
    const {
        data: fetchRateData,
        loading: fetchRateLoading,
        error: fetchRateError,
    } = useFetchRateWithQuestionsQuery({
        variables: {
            input: {
                rateID: id || 'not-found',
            },
        },
    })

    const [createQuestion, { loading: apiLoading, error: apiError }] =
        useCreateRateQuestionMutation()

    const rate = fetchRateData?.fetchRate.rate
    const rateName =
        (rate?.packageSubmissions &&
            rate?.packageSubmissions[0].rateRevision.formData
                .rateCertificationName) ||
        ''
    const stateHeader = useMemoizedStateHeader({
        subHeaderText:
            rate?.revisions[0].formData.rateCertificationName ?? undefined,
        stateCode: rate?.state.code,
        stateName: rate?.state.name,
    })

    // side effects
    useLayoutEffect(() => {
        updateHeading({ customHeading: stateHeader })
    }, [stateHeader, updateHeading])

    const activeMainContentId = 'rateQuestionPageMainContent'

    // Set the active main content to focus when click the Skip to main content button.
    useEffect(() => {
        updateActiveMainContent(activeMainContentId)
    }, [activeMainContentId, updateActiveMainContent])

    // confirm division is valid
    const realDivision = division?.toUpperCase()

    if (!realDivision || !isValidCmsDivison(realDivision)) {
        console.error(
            'Upload Rate Questions called with bogus division in URL: ',
            division
        )
        return <Error404 />
    }
    if (fetchRateLoading) {
        return <ErrorOrLoadingPage state="LOADING" />
    }

    if (fetchRateError) {
        return (
            <ErrorOrLoadingPage
                state={handleAndReturnErrorState(fetchRateError)}
            />
        )
    }

    if (!rate || rate.status === 'DRAFT' || !rate.questions) {
        console.error(
            'Upload Rate Questions returned a bad rate or had no questions'
        )
        return <GenericErrorPage />
    }

    const nextRoundNumber = getNextCMSRoundNumber(rate.questions, realDivision)

    const handleFormSubmit = async (cleaned: FileItemT[]) => {
        const questionDocs = cleaned.map((item) => {
            return {
                name: item.name,
                s3URL: item.s3URL as string,
            }
        })

        const input: CreateRateQuestionInput = {
            rateID: id as string,
            documents: questionDocs,
        }

        const createResult = await createRateQuestionWrapper(
            createQuestion,
            input
        )

        if (createResult instanceof Error) {
            console.info(createResult.message)
        } else {
            navigate(`/rates/${id}/question-and-answers?submit=question`)
        }
    }

    return (
        <div id={activeMainContentId} className={styles.uploadFormContainer}>
            <Breadcrumbs
                className="usa-breadcrumb--wrap"
                items={[
                    {
                        link: RoutesRecord.DASHBOARD_SUBMISSIONS,
                        text: 'Dashboard',
                    },
                    { link: `/rates/${id}`, text: rateName },
                    {
                        text: 'Add questions',
                        link: RoutesRecord.RATES_UPLOAD_QUESTION,
                    },
                ]}
            />

            <UploadQuestionsForm
                apiLoading={apiLoading}
                apiError={Boolean(apiError)}
                type="rate"
                handleSubmit={handleFormSubmit}
                round={nextRoundNumber}
                division={realDivision}
                id={rate.id}
                contractSubmissionType={contractSubmissionType!}
            />
        </div>
    )
}
