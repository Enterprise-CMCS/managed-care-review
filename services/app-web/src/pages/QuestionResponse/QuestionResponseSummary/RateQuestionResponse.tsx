import { useEffect, useLayoutEffect } from 'react'
import styles from '../QuestionResponse.module.scss'
import {
    CmsUser,
    useFetchRateWithQuestionsQuery,
    Division,
} from '../../../gen/gqlClient'
import { useParams, matchPath, useLocation } from 'react-router-dom'
import { GridContainer } from '@trussworks/react-uswds'
import { QuestionResponseSubmitBanner } from '../../../components'
import { GenericErrorPage } from '../../Errors/GenericErrorPage'
import { hasCMSUserPermissions } from '@mc-review/helpers'
import { getUserDivision } from '../QuestionResponseHelpers'
import { UserAccountWarningBanner } from '../../../components/Banner'
import { useAuth } from '../../../contexts/AuthContext'
import { RoutesRecord } from '@mc-review/constants'
import {
    ErrorOrLoadingPage,
    handleAndReturnErrorState,
} from '../../StateSubmission/SharedSubmissionComponents/ErrorOrLoadingPage'
import { usePage } from '../../../contexts/PageContext'
import { CMSQuestionResponseTable } from '../QATable/CMSQuestionResponseTable'
import { StateQuestionResponseTable } from '../QATable/StateQuestionResponseTable'
import { useMemoizedStateHeader } from '../../../hooks'

export const RateQuestionResponse = () => {
    const { id } = useParams() as { id: string }
    const location = useLocation()
    const submitType = new URLSearchParams(location.search).get('submit')
    const { loggedInUser } = useAuth()
    const { pathname } = useLocation()
    const { updateHeading, updateActiveMainContent } = usePage()
    const hasCMSPermissions = hasCMSUserPermissions(loggedInUser)
    let division: Division | undefined = undefined

    // Check current path, use rateID if we are viewing as state user since path is nested in summary path.
    const fetchRateID =
        matchPath(RoutesRecord.SUBMISSIONS_RATE_QUESTIONS_AND_ANSWERS, pathname)
            ?.params.rateID ?? id

    const { data, loading, error } = useFetchRateWithQuestionsQuery({
        variables: {
            input: {
                rateID: fetchRateID,
            },
        },
        fetchPolicy: 'cache-and-network',
    })

    const activeMainContentId = 'rateQuestionResponseMainContent'
    const rate = data?.fetchRate.rate
    const rateRev = rate?.packageSubmissions?.[0]?.rateRevision
    const stateHeader = useMemoizedStateHeader({
        subHeaderText:
            data?.fetchRate.rate?.revisions[0].formData.rateCertificationName ??
            undefined,
        stateCode: rate?.state.code,
        stateName: rate?.state.name,
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
        rate?.status === 'DRAFT' ||
        !loggedInUser ||
        !rateRev ||
        !rate.questions
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
                        indexQuestions={rate.questions}
                        consolidatedStatus={rate.consolidatedStatus}
                        userDivision={division}
                    />
                ) : (
                    <StateQuestionResponseTable
                        indexQuestions={rate.questions}
                        header={`Rate Q&A`}
                    />
                )}
            </GridContainer>
        </div>
    )
}
