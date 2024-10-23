import React, { useEffect } from 'react'
import { GridContainer } from '@trussworks/react-uswds'
import { useNavigate, useOutletContext, useParams } from 'react-router-dom'
import {
    CreateContractQuestionInput,
    useCreateContractQuestionMutation,
} from '../../../gen/gqlClient'
import { SideNavOutletContextType } from '../../SubmissionSideNav/SubmissionSideNav'
import { usePage } from '../../../contexts/PageContext'
import { Breadcrumbs } from '../../../components/Breadcrumbs/Breadcrumbs'
import { createContractQuestionWrapper } from '../../../gqlHelpers/mutationWrappersForUserFriendlyErrors'
import { RoutesRecord } from '../../../constants'
import { GenericErrorPage } from '../../Errors/GenericErrorPage'
import { UploadQuestionsForm } from './UploadQuestionsForm'
import { FileItemT } from '../../../components'

export const UploadContractQuestions = () => {
    // router context
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    const { id } = useParams<{ division: string; id: string }>()
    const navigate = useNavigate()
    const { packageName, contract } =
        useOutletContext<SideNavOutletContextType>()

    // api
    const [createQuestion, { loading: apiLoading, error: apiError }] =
        useCreateContractQuestionMutation()

    // page level state
    const { updateHeading } = usePage()
    useEffect(() => {
        updateHeading({ customHeading: `${packageName} Add questions` })
    }, [packageName, updateHeading])

    if (contract.status === 'DRAFT') {
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
            />
        </GridContainer>
    )
}
