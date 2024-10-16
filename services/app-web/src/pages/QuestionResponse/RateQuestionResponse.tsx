import styles from './QuestionResponse.module.scss'
import {
    CmsUser,
    useFetchRateWithQuestionsQuery,
    Division,
} from '../../gen/gqlClient'
import { useParams } from 'react-router-dom'
import { GridContainer } from '@trussworks/react-uswds'
import { Loading, SectionHeader } from '../../components'
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

export const RateQuestionResponse = () => {
    const { rateID } = useParams() as { rateID: string }
    const { loggedInUser } = useAuth()
    let division: Division | undefined = undefined

    const { data, loading, error } = useFetchRateWithQuestionsQuery({
        variables: {
            input: {
                rateID,
            },
        },
        fetchPolicy: 'network-only',
    })

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
    const rateRev = rate?.packageSubmissions?.[0].rateRevision

    if (rate?.status === 'DRAFT' || !loggedInUser || !rateRev) {
        return <GenericErrorPage />
    }

    const hasCMSPermissions = hasCMSUserPermissions(loggedInUser)

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
                <SectionHeader
                    header={`Rate questions: ${rateRev.formData.rateCertificationName}`}
                    hideBorder
                />
                <section key={division} className={styles.questionSection}>
                    <h2 className={styles.outstandingQuestionsHeader}>
                        Outstanding questions
                    </h2>
                    <div>
                        <p>No questions have been submitted yet.</p>
                    </div>
                </section>
            </GridContainer>
        </div>
    )
}
