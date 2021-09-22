import React, { useEffect } from 'react'
import { GridContainer, Link } from '@trussworks/react-uswds'
import { NavLink, useParams, useLocation } from 'react-router-dom'
import sprite from 'uswds/src/img/sprite.svg'
import styles from './SubmissionSummary.module.scss'
import { useFetchStateSubmissionQuery } from '../../../gen/gqlClient'
import { Loading } from '../../../components/Loading'
import {
    SubmissionTypeSummaryCard,
    ContractDetailsSummaryCard,
    RateDetailsSummaryCard,
    ContactsSummaryCard,
    DocumentsSummaryCard,
} from '../../../components/SubmissionSummaryCard'
import { GenericError } from '../../Errors/GenericError'
import { usePage } from '../../../contexts/PageContext'
import { useAuth } from '../../../contexts/AuthContext'

export const SubmissionSummary = (): React.ReactElement => {
    const { id } = useParams<{ id: string }>()
    const { pathname } = useLocation()
    const { loggedInUser } = useAuth()
    const { updateHeading } = usePage()

    const { loading, error, data } = useFetchStateSubmissionQuery({
        variables: {
            input: {
                submissionID: id,
            },
        },
    })

    const submission = data?.fetchStateSubmission.submission

    useEffect(() => {
        updateHeading(pathname, submission?.name)
    }, [updateHeading, pathname, submission?.name])

    if (loading) {
        return (
            <GridContainer>
                <Loading />
            </GridContainer>
        )
    }

    if (error || !submission) return <GenericError />

    const isContractActionAndRateCertification =
        submission.submissionType === 'CONTRACT_AND_RATES'

    return (
        <div className={styles.background}>
            <GridContainer
                data-testid="submission-summary"
                className={styles.container}
            >
                {loggedInUser?.__typename === 'StateUser' ? (
                    <Link
                        asCustom={NavLink}
                        variant="unstyled"
                        to={{
                            pathname: '/dashboard',
                            state: {
                                defaultProgramID: submission.programID,
                            },
                        }}
                    >
                        <svg
                            className="usa-icon"
                            aria-hidden="true"
                            focusable="false"
                            role="img"
                        >
                            <use xlinkHref={`${sprite}#arrow_back`}></use>
                        </svg>
                        <span>&nbsp;Back to state dashboard</span>
                    </Link>
                ) : null}

                <SubmissionTypeSummaryCard submission={submission} />

                <ContractDetailsSummaryCard submission={submission} />

                {isContractActionAndRateCertification && (
                    <RateDetailsSummaryCard submission={submission} />
                )}

                <ContactsSummaryCard submission={submission} />

                <DocumentsSummaryCard submission={submission} />
            </GridContainer>
        </div>
    )
}

export type SectionHeaderProps = {
    header: string
    submissionName?: boolean
    href: string
}
