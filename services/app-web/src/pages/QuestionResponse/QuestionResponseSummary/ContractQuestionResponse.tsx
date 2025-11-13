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
import { hasCMSUserPermissions } from '@mc-review/helpers'
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
    const { updateHeading, updateActiveMainContent } = usePage()
    const { loggedInUser } = useAuth()
    const hasCMSPermissions = hasCMSUserPermissions(loggedInUser)

    const { data, loading, error } = useFetchContractWithQuestionsQuery({
        variables: {
            input: {
                contractID: id,
            },
        },
        fetchPolicy: 'cache-and-network',
    })

    const contract = data?.fetchContract.contract
    const contractRev = contract?.packageSubmissions?.[0]?.contractRevision
    const contractName = contractRev?.contractName ?? undefined
    const activeMainContentId = 'contractQuestionResponseMainContent'

    useEffect(() => {
        updateHeading({ customHeading: contractName })
    }, [contractName, updateHeading])

    // Set the active main content to focus when click the Skip to main content button.
    useEffect(() => {
        updateActiveMainContent(activeMainContentId)
    }, [activeMainContentId, updateActiveMainContent])

    // Handle loading and error states for fetching data while using cached data
    if (!data && loading) {
        return <ErrorOrLoadingPage state="LOADING" />
    } else if (!data && error) {
        return <ErrorOrLoadingPage state={handleAndReturnErrorState(error)} />
    } else if (
        contract?.status === 'DRAFT' ||
        !contractRev ||
        !contract.questions
    ) {
        return <GenericErrorPage />
    }

    if (hasCMSPermissions) {
        division = getUserDivision(loggedInUser as CmsUser)
    }
    return (
        <div className={styles.background} id={activeMainContentId}>
            <GridContainer className={styles.container}>
                {hasCMSPermissions && !division && <UserAccountWarningBanner />}

                {submitType && (
                    <QuestionResponseSubmitBanner submitType={submitType} />
                )}

                {hasCMSPermissions ? (
                    <CMSQuestionResponseTable
                        indexQuestions={contract.questions}
                        userDivision={division}
                        consolidatedStatus={contract.consolidatedStatus}
                    />
                ) : (
                    <StateQuestionResponseTable
                        indexQuestions={contract.questions}
                        contractStatus={contract.consolidatedStatus}
                        header="Contract Q&A"
                    />
                )}
            </GridContainer>
        </div>
    )
}
