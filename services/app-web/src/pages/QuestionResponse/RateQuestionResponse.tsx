import { useEffect, useState } from 'react'
import styles from './QuestionResponse.module.scss'
import {
    CmsUser,
    useFetchRateWithQuestionsQuery,
    Division,
} from '../../gen/gqlClient'
import { useParams, matchPath, useLocation } from 'react-router-dom'
import { GridContainer } from '@trussworks/react-uswds'
import {
    QuestionResponseSubmitBanner,
    SectionHeader,
} from '../../components'
import { GenericErrorPage } from '../Errors/GenericErrorPage'
import { hasCMSUserPermissions } from '../../gqlHelpers'
import { getUserDivision } from './QuestionResponseHelpers'
import { UserAccountWarningBanner } from '../../components/Banner'
import { ContactSupportLink } from '../../components/ErrorAlert/ContactSupportLink'
import { useAuth } from '../../contexts/AuthContext'
import { RoutesRecord } from '../../constants'
import { ErrorOrLoadingPage, handleAndReturnErrorState } from '../StateSubmission/ErrorOrLoadingPage'
import { usePage } from '../../contexts/PageContext'
import { CMSQuestionResponseTable } from './QATable/CMSQuestionResponseTable'
import { StateQuestionResponseTable } from './QATable/StateQuestionResponseTable'

export const RateQuestionResponse = () => {
    const { id } = useParams() as { id: string }
    const location = useLocation()
    const submitType = new URLSearchParams(location.search).get('submit')
    const { loggedInUser } = useAuth()
    const { pathname } = useLocation()
    const { updateHeading } = usePage()
    const [rateName, setRateName] = useState<string | undefined>(undefined)
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
        fetchPolicy: 'network-only',
    })

    useEffect(() => {
        updateHeading({ customHeading: rateName })
    }, [rateName, updateHeading])

    if (loading) {
        return <ErrorOrLoadingPage state="LOADING" />
    }

    if (error) {
        return (
            <ErrorOrLoadingPage
                state={handleAndReturnErrorState(error)}
            />
        )
    }
    const rate = data?.fetchRate.rate
    const rateRev = rate?.packageSubmissions?.[0]?.rateRevision

    if (
        rate?.status === 'DRAFT' ||
        !loggedInUser ||
        !rateRev ||
        !rate.questions
    ) {
        return <GenericErrorPage />
    }

    if (
        rateName !== rateRev.formData.rateCertificationName &&
        rateRev.formData.rateCertificationName
    ) {
        setRateName(rateRev.formData.rateCertificationName)
    }

    if (hasCMSPermissions) {
        division = getUserDivision(loggedInUser as CmsUser)
    }

    return (
        <div className={styles.background}>
            <GridContainer className={styles.container}>
                {hasCMSPermissions && !division && (
                    <UserAccountWarningBanner
                        header={'Missing division'}
                        message={
                            <span>
                                You must be assigned to a division in order to
                                ask questions about a submission. Please&nbsp;
                                <ContactSupportLink />
                                &nbsp;to add your division.
                            </span>
                        }
                    />
                )}
                {submitType && (
                    <QuestionResponseSubmitBanner submitType={submitType} />
                )}
                {hasCMSPermissions ? (
                    <CMSQuestionResponseTable
                        indexQuestions={rate.questions}
                        userDivision={division}
                    />
                ) : (
                    <>
                        <SectionHeader
                            header={`Rate questions: ${rateRev.formData.rateCertificationName}`}
                            hideBorder
                        />
                        <StateQuestionResponseTable
                         indexQuestions={rate.questions}
                        />
                    </>
                )}
            </GridContainer>
        </div>
    )
}
