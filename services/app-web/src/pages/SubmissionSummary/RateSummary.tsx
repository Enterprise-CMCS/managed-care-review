import { GridContainer, Link } from '@trussworks/react-uswds'
import React, { useEffect, useState } from 'react'
import { NavLink, useParams } from 'react-router-dom'
import sprite from 'uswds/src/img/sprite.svg'
import { Loading } from '../../components'
import { usePage } from '../../contexts/PageContext'
import { useFetchRateQuery } from '../../gen/gqlClient'
import styles from './SubmissionSummary.module.scss'
import { GenericErrorPage } from '../Errors/GenericErrorPage'
import { RoutesRecord } from '../../constants'
import { SingleRateSummarySection } from '../../components/SubmissionSummarySection/RateDetailsSummarySection/SingleRateSummarySection'

type RouteParams = {
    id: string
}

export const RateSummary = (): React.ReactElement => {
    // Page level state
    const { updateHeading } = usePage()
    const [rateName, setRateName] = useState<string | undefined>(undefined)
    const { id } = useParams<keyof RouteParams>()
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
    const currentRateRev =
        rate?.status === 'UNLOCKED' ? rate?.revisions[1] : rate?.revisions[0]

    if (loading) {
        return (
            <GridContainer>
                <Loading />
            </GridContainer>
        )
    } else if (error || !rate || !currentRateRev?.formData) {
        return <GenericErrorPage />
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
                <div className={styles.backLinkContainer}>
                    <Link
                        asCustom={NavLink}
                        to={{
                            pathname: RoutesRecord.DASHBOARD_RATES,
                        }}
                    >
                        <svg
                            className="usa-icon"
                            aria-hidden="true"
                            focusable="false"
                            role="img"
                        >
                            <use xlinkHref={`${sprite}#arrow_back`} />
                        </svg>
                        <span>&nbsp;Back to dashboard</span>
                    </Link>
                </div>
                <SingleRateSummarySection
                    rate={rate}
                    isSubmitted // can assume isSubmitted because we are building for CMS users
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
