import { GridContainer, Icon } from '@trussworks/react-uswds'
import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Loading, NavLinkWithLogging } from '../../components'
import { usePage } from '../../contexts/PageContext'
import { useFetchRateQuery } from '../../gen/gqlClient'
import styles from '../SubmissionSummary/SubmissionSummary.module.scss'
import { GenericErrorPage } from '../Errors/GenericErrorPage'
import { RoutesRecord } from '../../constants'
import { SingleRateSummarySection } from '../../components/SubmissionSummarySection/RateDetailsSummarySection/SingleRateSummarySection'
import { useAuth } from '../../contexts/AuthContext'
import { ErrorForbiddenPage } from '../Errors/ErrorForbiddenPage'
import { Error404 } from '../Errors/Error404Page'
import { RateWithdrawnBanner } from '../../components/Banner'

export const RateSummary = (): React.ReactElement => {
    // Page level state
    const { loggedInUser } = useAuth()
    const { updateHeading } = usePage()
    const navigate = useNavigate()
    const [rateName, setRateName] = useState<string | undefined>(undefined)
    const { id } = useParams()
    if (!id) {
        throw new Error(
            'PROGRAMMING ERROR: id param not set in state submission form.'
        )
    }

    useEffect(() => {
        updateHeading({ customHeading: rateName })
    }, [rateName, updateHeading])

    const { data, loading, error } = useFetchRateQuery({
        variables: {
            input: {
                rateID: id,
            },
        },
    })

    const rate = data?.fetchRate.rate
    const currentRateRev = rate?.revisions[0]
    const withdrawInfo = rate?.withdrawInfo

    if (loading) {
        return (
            <GridContainer>
                <Loading />
            </GridContainer>
        )
    } else if (error || !rate || !currentRateRev?.formData) {
        //error handling for a state user that tries to access rates for a different state
        if (error?.graphQLErrors[0]?.extensions?.code === 'FORBIDDEN') {
            return (
                <ErrorForbiddenPage errorMsg={error.graphQLErrors[0].message} />
            )
        } else if (error?.graphQLErrors[0]?.extensions?.code === 'NOT_FOUND') {
            return <Error404 />
        } else {
            return <GenericErrorPage />
        }
    }

    // Redirecting a state user to the edit page if rate is unlocked
    if (
        data &&
        loggedInUser?.role === 'STATE_USER' &&
        rate.status === 'UNLOCKED'
    ) {
        navigate(`/rates/${id}/edit`)
    }

    if (
        rateName !== currentRateRev.formData.rateCertificationName &&
        currentRateRev.formData.rateCertificationName
    ) {
        setRateName(currentRateRev.formData.rateCertificationName)
    }

    return (
        <div className={styles.backgroundFullPage}>
            <GridContainer
                data-testid="rate-summary"
                className={styles.container}
            >
                {withdrawInfo && (
                    <RateWithdrawnBanner
                        withdrawInfo={withdrawInfo}
                        className={styles.banner}
                    />
                )}

                <div>
                    <NavLinkWithLogging
                        //TODO: Will have to remove this conditional once the rate dashboard is made available to state users
                        to={{
                            pathname:
                                loggedInUser?.__typename === 'StateUser'
                                    ? RoutesRecord.DASHBOARD
                                    : RoutesRecord.DASHBOARD_RATES,
                        }}
                        event_name="back_button"
                    >
                        <Icon.ArrowBack />
                        <span>&nbsp;Back to dashboard</span>
                    </NavLinkWithLogging>
                </div>
                <SingleRateSummarySection
                    rate={rate}
                    isSubmitted // can assume isSubmitted because we redirect for unlocked
                    statePrograms={rate.state.programs}
                />
            </GridContainer>
        </div>
    )
}

export type SectionHeaderProps = {
    header: string
    submissionName?: boolean
    href: string
}
