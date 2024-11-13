import React, { useEffect } from 'react'
import { GridContainer } from '@trussworks/react-uswds'
import { useNavigate, useOutletContext, useParams } from 'react-router-dom'
import {
    CreateQuestionResponseInput,
    useCreateContractQuestionResponseMutation,
    Division,
} from '../../../gen/gqlClient'
import { usePage } from '../../../contexts/PageContext'
import { SideNavOutletContextType } from '../../SubmissionSideNav/SubmissionSideNav'
import { Breadcrumbs } from '../../../components/Breadcrumbs/Breadcrumbs'
import { createContractResponseWrapper } from '../../../gqlHelpers/mutationWrappersForUserFriendlyErrors'
import { RoutesRecord } from '../../../constants'
import { GenericErrorPage } from '../../Errors/GenericErrorPage'
import { UploadResponseForm } from './UploadResponseForm'
import { FileItemT } from '../../../components'

export const UploadContractResponse = () => {
    // router context
    const { division, id, questionID } = useParams<{
        division: string
        id: string
        questionID: string
    }>()

    const navigate = useNavigate()

    // api
    const [createResponse, { loading: apiLoading, error: apiError }] =
        useCreateContractQuestionResponseMutation()

    // page level state
    const { updateHeading } = usePage()
    const { packageName, contract } =
        useOutletContext<SideNavOutletContextType>()
    useEffect(() => {
        updateHeading({ customHeading: packageName })
    }, [packageName, updateHeading])

    if (contract.status === 'DRAFT') {
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
            division as Division
        )
        if (createResult instanceof Error) {
            console.info(createResult.message)
        } else {
            navigate(`/submissions/${id}/question-and-answers?submit=response`)
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
                        text: 'Add response',
                        link: RoutesRecord.SUBMISSIONS_UPLOAD_CONTRACT_RESPONSE,
                    },
                ]}
            />

            <UploadResponseForm
                handleSubmit={handleFormSubmit}
                apiLoading={apiLoading}
                apiError={Boolean(apiError)}
                type="contract"
            />
        </GridContainer>
    )
}
