import React, { useEffect } from 'react'
import { GridContainer } from '@trussworks/react-uswds'
import { useNavigate, useParams } from 'react-router-dom'
import {
    CreateQuestionResponseInput,
    Division,
    useCreateRateQuestionResponseMutation,
    useFetchRateWithQuestionsQuery,
} from '../../../gen/gqlClient'
import { usePage } from '../../../contexts/PageContext'
import { Breadcrumbs } from '../../../components/Breadcrumbs/Breadcrumbs'
import { createRateQuestionResponseWrapper } from '../../../gqlHelpers/mutationWrappersForUserFriendlyErrors'
import { RoutesRecord } from '../../../constants'
import { GenericErrorPage } from '../../Errors/GenericErrorPage'
import { UploadResponseForm } from './UploadResponseForm'
import { FileItemT } from '../../../components'
import { ErrorOrLoadingPage } from '../../StateSubmission'
import { handleAndReturnErrorState } from '../../StateSubmission/ErrorOrLoadingPage'

export const UploadRateResponse = () => {
    // router context
    const { division, id, rateID, questionID } = useParams<{
        division: string
        id: string
        rateID: string
        questionID: string
    }>()

    const navigate = useNavigate()
    const { updateHeading } = usePage()

    // api
    const {
        data: fetchRateData,
        loading: fetchRateLoading,
        error: fetchRateError,
    } = useFetchRateWithQuestionsQuery({
        variables: {
            input: {
                rateID: rateID || 'not-found',
            },
        },
    })

    const [createResponse, { loading: apiLoading, error: apiError }] =
        useCreateRateQuestionResponseMutation()

    const rate = fetchRateData?.fetchRate.rate
    const rateName =
        (rate?.packageSubmissions &&
            rate?.packageSubmissions[0].rateRevision.formData
                .rateCertificationName) ||
        ''
    const parentContractID = id
    const contractName =
        (rate?.packageSubmissions &&
            rate?.packageSubmissions[0].contractRevisions.find(
                (contractRev) => contractRev.id == parentContractID
            )?.contractName) ||
        undefined

    // side effects
    useEffect(() => {
        updateHeading({ customHeading: `${rateName} Add response` })
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

        const createResult = await createRateQuestionResponseWrapper(
            createResponse,
            rateID as string,
            input,
            division as Division
        )

        if (createResult instanceof Error) {
            console.info(createResult.message)
        } else {
            navigate(
                `/submissions/${parentContractID}/question-and-answers?submit=response`
            )
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
                    {
                        link: `/submissions/${parentContractID}`,
                        text: contractName ?? 'Unknown Contract',
                    },
                    {
                        link: `/submissions/${parentContractID}/rates/${rate.id}/question-and-answers}`,
                        text: `Rate questions: ${rateName}`,
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
                type="rate"
            />
        </GridContainer>
    )
}
