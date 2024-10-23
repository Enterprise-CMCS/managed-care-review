import React, { useEffect } from 'react'
import { GridContainer } from '@trussworks/react-uswds'
import { useNavigate, useParams } from 'react-router-dom'
import {
    CreateRateQuestionInput,
    useCreateRateQuestionMutation,
    useFetchRateWithQuestionsQuery,
} from '../../../gen/gqlClient'
import { usePage } from '../../../contexts/PageContext'
import { Breadcrumbs } from '../../../components/Breadcrumbs/Breadcrumbs'
import { createRateQuestionWrapper } from '../../../gqlHelpers/mutationWrappersForUserFriendlyErrors'
import { RoutesRecord } from '../../../constants'
import { UploadQuestionsForm } from './UploadQuestionsForm'
import { FileItemT } from '../../../components'
import { ErrorOrLoadingPage } from '../../StateSubmission'
import { handleAndReturnErrorState } from '../../StateSubmission/ErrorOrLoadingPage'
import { GenericErrorPage } from '../../Errors/GenericErrorPage'

export const UploadRateQuestions = () => {
    // router context
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    const { updateHeading } = usePage()
    const { id } = useParams<{ division: string; id: string; rateID: string }>()
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

    // side effects
    useEffect(() => {
        updateHeading({ customHeading: `${rateName} Add questions` })
    }, [rateName, updateHeading])

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

    if (!rate || rate.status === 'DRAFT') {
        return <GenericErrorPage />
    }

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
        <GridContainer>
            <Breadcrumbs
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
            />
        </GridContainer>
    )
}
