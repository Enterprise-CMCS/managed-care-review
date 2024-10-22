import styles from './QuestionResponse.module.scss'
import {
    CmsUser,
    useFetchRateWithQuestionsQuery,
    Division,
} from '../../gen/gqlClient'
import { useParams, matchPath, useLocation } from 'react-router-dom'
import { GridContainer } from '@trussworks/react-uswds'
import { Loading, NavLinkWithLogging, SectionHeader } from '../../components'
import { GenericErrorPage } from '../Errors/GenericErrorPage'
import { hasCMSUserPermissions } from '../../gqlHelpers'
import { getUserDivision } from './QuestionResponseHelpers'
import { UserAccountWarningBanner } from '../../components/Banner'
import { ContactSupportLink } from '../../components/ErrorAlert/ContactSupportLink'
import { useAuth } from '../../contexts/AuthContext'
import { ApolloError } from '@apollo/client'
import { handleApolloError } from '../../gqlHelpers/apolloErrors'
import { Error404 } from '../Errors/Error404Page'
import { recordJSException } from '../../otelHelpers'
import { RoutesRecord } from '../../constants'
import { usePage } from '../../contexts/PageContext'
import { useEffect, useState } from 'react'

export const RateQuestionResponse = () => {
    const { id } = useParams() as { id: string }
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
        return (
            <GridContainer>
                <Loading />
            </GridContainer>
        )
    }

    if (error) {
        const err = error
        console.error('Error from API fetch', error)
        if (err instanceof ApolloError) {
            handleApolloError(err, true)

            if (err.graphQLErrors[0]?.extensions?.code === 'NOT_FOUND') {
                return <Error404 />
            }
        }

        recordJSException(err)
        return <GenericErrorPage /> // api failure or protobuf decode failure
    }

    const rate = data?.fetchRate.rate
    const rateRev = rate?.packageSubmissions?.[0]?.rateRevision

    if (rate?.status === 'DRAFT' || !loggedInUser || !rateRev) {
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
                {hasCMSPermissions ? (
                    <>
                        <section
                            key={division}
                            className={styles.yourQuestionSection}
                        >
                            <SectionHeader header="Your division's questions">
                                {hasCMSPermissions && division && (
                                    <NavLinkWithLogging
                                        className="usa-button"
                                        variant="unstyled"
                                        to={`./`}
                                    >
                                        Add questions
                                    </NavLinkWithLogging>
                                )}
                            </SectionHeader>
                            <div>
                                <p>No questions have been submitted yet.</p>
                            </div>
                        </section>
                        <section
                            key={division}
                            className={styles.questionSection}
                        >
                            <SectionHeader header="Other division's questions" />
                            <div>
                                <p>No questions have been submitted yet.</p>
                            </div>
                        </section>
                    </>
                ) : (
                    <>
                        <SectionHeader
                            header={`Rate questions: ${rateRev.formData.rateCertificationName}`}
                            hideBorder
                        />
                        <section
                            key={division}
                            className={styles.questionSection}
                        >
                            <SectionHeader header="Outstanding questions" />
                            <div>
                                <p>No questions have been submitted yet.</p>
                            </div>
                        </section>
                    </>
                )}
            </GridContainer>
        </div>
    )
}
