import { GridContainer, Icon } from '@trussworks/react-uswds'
import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Loading, NavLinkWithLogging } from '../../components'
import { usePage } from '../../contexts/PageContext'
import { useFetchRateQuery, useFetchContractQuery } from '../../gen/gqlClient'
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
    const { id } = useParams() as { id: string }

    useEffect(() => {
        updateHeading({ customHeading: rateName })
    }, [rateName, updateHeading])

    const isStateUser = loggedInUser?.role === 'STATE_USER'

    const { data, loading, error } = useFetchRateQuery({
        variables: {
            input: {
                rateID: id,
            },
        },
    })

    const rate = data?.fetchRate.rate
    const {
        data: fetchContractData,
        loading: loadingContract,
        error: fetchContractError,
    } = useFetchContractQuery({
        variables: {
            input: {
                contractID: rate?.parentContractID ?? 'unknown-contract',
            },
        },
    })
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

    const contract = fetchContractData?.fetchContract.contract

    if (loadingContract) {
        return (
            <GridContainer>
                <Loading />
            </GridContainer>
        )
    } else if (fetchContractError || !contract) {
        //error handling for a state user that tries to access contracts for a different state
        if (
            fetchContractError?.graphQLErrors[0]?.extensions?.code ===
            'FORBIDDEN'
        ) {
            return (
                <ErrorForbiddenPage
                    errorMsg={fetchContractError.graphQLErrors[0].message}
                />
            )
        } else if (
            fetchContractError?.graphQLErrors[0]?.extensions?.code ===
            'NOT_FOUND'
        ) {
            return <Error404 />
        } else {
            return <GenericErrorPage />
        }
    }

    return (
        <div className={styles.background}>
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
                {isStateUser && (
                    // state user does not see the RateSummarySideNav which has its own back button.
                    <div>
                        <NavLinkWithLogging
                            to={{
                                pathname: RoutesRecord.DASHBOARD,
                            }}
                            event_name="back_button"
                        >
                            <Icon.ArrowBack />
                            <span>&nbsp;Back to dashboard</span>
                        </NavLinkWithLogging>
                    </div>
                )}

                <SingleRateSummarySection
                    rate={rate}
                    isSubmitted // can assume isSubmitted because we redirect for unlocked
                    statePrograms={rate.state.programs}
                    parentContractStatus={contract?.consolidatedStatus}
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
