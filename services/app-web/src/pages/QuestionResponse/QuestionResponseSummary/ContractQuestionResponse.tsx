import { useEffect } from 'react'
import { GridContainer } from '@trussworks/react-uswds'
import styles from '../QuestionResponse.module.scss'

import { useLocation, useParams } from 'react-router-dom'
import { usePage } from '../../../contexts/PageContext'
import {
    QuestionResponseSubmitBanner,
    UserAccountWarningBanner,
} from '../../../components/Banner'
import {
    CmsUser,
    Division,
    useFetchContractWithQuestionsQuery,
} from '../../../gen/gqlClient'
import { GenericErrorPage } from '../../Errors/GenericErrorPage'
import { hasCMSUserPermissions } from '../../../gqlHelpers'
import { getUserDivision } from '../QuestionResponseHelpers'
import { CMSQuestionResponseTable } from '../QATable/CMSQuestionResponseTable'
import { StateQuestionResponseTable } from '../QATable/StateQuestionResponseTable'
import { ErrorOrLoadingPage } from '../../StateSubmission'
import { handleAndReturnErrorState } from '../../StateSubmission/ErrorOrLoadingPage'
import { useAuth } from '../../../contexts/AuthContext'

export const ContractQuestionResponse = () => {
    const { id } = useParams() as { id: string }
    const location = useLocation()
    const submitType = new URLSearchParams(location.search).get('submit')
    let division: Division | undefined = undefined
    const { updateHeading } = usePage()
    const { loggedInUser } = useAuth()
    const hasCMSPermissions = hasCMSUserPermissions(loggedInUser)

    const { data, loading, error } = useFetchContractWithQuestionsQuery({
        variables: {
            input: {
                contractID: id,
            },
        },
        fetchPolicy: 'network-only',
    })

    const contract = data?.fetchContract.contract
    const contractRev = contract?.packageSubmissions?.[0]?.contractRevision
    const contractName = contractRev?.contractName ?? undefined

    useEffect(() => {
        updateHeading({ customHeading: contractName })
    }, [contractName, updateHeading])

    if (loading) {
        return <ErrorOrLoadingPage state="LOADING" />
    }

    if (error) {
        return <ErrorOrLoadingPage state={handleAndReturnErrorState(error)} />
    }

    if (contract?.status === 'DRAFT' || !contractRev || !contract.questions) {
        return <GenericErrorPage />
    }

    if (hasCMSPermissions) {
        division = getUserDivision(loggedInUser as CmsUser)
    }
    return (
        <div className={styles.background}>
            <GridContainer className={styles.container}>
                {hasCMSPermissions && !division && <UserAccountWarningBanner />}

                {submitType && (
                    <QuestionResponseSubmitBanner submitType={submitType} />
                )}

                {hasCMSPermissions ? (
                    <CMSQuestionResponseTable
                        indexQuestions={contract.questions}
                        userDivision={division}
                    />
                ) : (
                    <StateQuestionResponseTable
                        indexQuestions={contract.questions}
                        header="Contract questions"
                    />
                )}
            </GridContainer>
        </div>
    )
}
