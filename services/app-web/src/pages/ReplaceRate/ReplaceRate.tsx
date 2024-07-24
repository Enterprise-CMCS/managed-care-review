import { GridContainer } from '@trussworks/react-uswds'
import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { usePage } from '../../contexts/PageContext'
import { useFetchRateQuery } from '../../gen/gqlClient'
import styles from '../SubmissionSummary/SubmissionSummary.module.scss'
import { useAuth } from '../../contexts/AuthContext'
import {
    ErrorOrLoadingPage,
} from '../../pages/StateSubmission/ErrorOrLoadingPage'

export const ReplaceRate = (): React.ReactElement => {
    // Page level state
    const { loggedInUser } = useAuth()
    const { updateHeading } = usePage()
    const [rateName, setRateName] = useState<string | undefined>(undefined)
    const { rateID } = useParams()
    if (!rateID) {
        throw new Error('PROGRAMMING ERROR: rateID param not set')
    }

    useEffect(() => {
        updateHeading({ customHeading: rateName })
    }, [rateName, updateHeading])

    const { data, loading, error } = useFetchRateQuery({
        variables: {
            input: {
                rateID,
            },
        },
    })

    const rate = data?.fetchRate.rate
    const currentRateRev = rate?.revisions[0]

    if (loading) {
        return <ErrorOrLoadingPage state="LOADING" />
    } else if (error || !rate || !currentRateRev?.formData) {
        if (error?.graphQLErrors[0]?.extensions?.code === 'NOT_FOUND') {
            return <ErrorOrLoadingPage state="NOT_FOUND" />
        } else if (loggedInUser?.role != 'ADMIN_USER') {
            return <ErrorOrLoadingPage state="FORBIDDEN" />
        } else {
            return <ErrorOrLoadingPage state="GENERIC_ERROR" />
        }
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
                <h2>{rateName}</h2>
            </GridContainer>
        </div>
    )
}

export type SectionHeaderProps = {
    header: string
    submissionName?: boolean
    href: string
}
