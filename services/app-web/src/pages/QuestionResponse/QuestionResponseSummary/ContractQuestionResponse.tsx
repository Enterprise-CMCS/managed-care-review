import { useEffect, useLayoutEffect } from 'react'
import { GridContainer } from '@trussworks/react-uswds'
import styles from '../QuestionResponse.module.scss'

import { useLocation, useParams } from 'react-router-dom'
import { usePage } from '../../../contexts/PageContext'
import {
    QuestionResponseSubmitBanner,
    UserAccountWarningBanner,
} from '../../../components/Banner'
import { useQuery } from '@apollo/client/react'
import {
    CmsUser,
    Division,
    FetchContractWithQuestionsDocument,
} from '../../../gen/gqlClient'
import { GenericErrorPage } from '../../Errors/GenericErrorPage'
import { hasCMSUserPermissions, canViewCMSData } from '@mc-review/helpers'
import {
    allQuestionsAnswered,
    getUserDivision,
} from '../QuestionResponseHelpers'
import { CMSQuestionResponseTable } from '../QATable/CMSQuestionResponseTable'
import { StateQuestionResponseTable } from '../QATable/StateQuestionResponseTable'
import { ErrorOrLoadingPage } from '../../StateSubmission'
import { handleAndReturnErrorState } from '../../StateSubmission/SharedSubmissionComponents'
import { useAuth } from '../../../contexts/AuthContext'
import { useMemoizedStateHeader } from '../../../hooks'

export const ContractQuestionResponse = () => {
    const { id } = useParams() as { id: string }
    const location = useLocation()
    const submitType = new URLSearchParams(location.search).get('submit')
    let division: Division | undefined = undefined
    const { updateHeading, updateActiveMainContent } = usePage()
    const { loggedInUser } = useAuth()
    const hasCMSPermissions = hasCMSUserPermissions(loggedInUser)
    // Read-only users see the CMS (review) view of Q&A, but without any write
    // affordances, which remain gated by hasCMSPermissions.
    const showCMSView = canViewCMSData(loggedInUser)

    const { data, loading, error } = useQuery(
        FetchContractWithQuestionsDocument,
        {
            variables: {
                input: {
                    contractID: id,
                },
            },
            fetchPolicy: 'cache-and-network',
        }
    )

    const contract = data?.fetchContract.contract
    const contractRev = contract?.packageSubmissions?.[0]?.contractRevision
    const contractName = contractRev?.contractName ?? undefined
    const activeMainContentId = 'contractQuestionResponseMainContent'
    const stateHeader = useMemoizedStateHeader({
        subHeaderText: contractName,
        stateCode: contract?.state.code,
        stateName: contract?.state.name,
        contractType: contract?.contractSubmissionType,
    })

    useLayoutEffect(() => {
        updateHeading({ customHeading: stateHeader })
    }, [stateHeader, updateHeading])

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

    const canAddQuestions = allQuestionsAnswered(contract.questions)

    return (
        <div className={styles.background} id={activeMainContentId}>
            <GridContainer className={styles.container}>
                <h1>Contract questions</h1>

                {hasCMSPermissions && !division && (
                    <UserAccountWarningBanner className={styles.banner} />
                )}

                {submitType && (
                    <QuestionResponseSubmitBanner
                        submitType={submitType}
                        className={styles.banner}
                    />
                )}

                {showCMSView ? (
                    <CMSQuestionResponseTable
                        indexQuestions={contract.questions}
                        questionType="contract"
                        userDivision={division}
                        consolidatedStatus={contract.consolidatedStatus}
                        canAddQuestionsGotAllResponses={canAddQuestions}
                    />
                ) : (
                    <StateQuestionResponseTable
                        indexQuestions={contract.questions}
                        questionType="contract"
                        contractStatus={contract.consolidatedStatus}
                    />
                )}
            </GridContainer>
        </div>
    )
}
