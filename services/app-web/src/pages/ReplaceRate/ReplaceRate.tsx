import { GridContainer } from '@trussworks/react-uswds'
import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Loading } from '../../components'
import { usePage } from '../../contexts/PageContext'
import { useFetchRateQuery } from '../../gen/gqlClient'
import styles from '../SubmissionSummary/SubmissionSummary.module.scss'
import { GenericErrorPage } from '../Errors/GenericErrorPage'
import { useAuth } from '../../contexts/AuthContext'
import { Error404 } from '../Errors/Error404Page'

export const ReplaceRate = (): React.ReactElement => {
    // Page level state
    const { loggedInUser } = useAuth()
    const { updateHeading } = usePage()
    const navigate = useNavigate()
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
        return (
            <GridContainer>
                <Loading />
            </GridContainer>
        )
    } else if (error || !rate || !currentRateRev?.formData) {
        if (error?.graphQLErrors[0]?.extensions?.code === 'NOT_FOUND') {
            return <Error404 />
        } else {
            return <GenericErrorPage />
        }
    }

    // Redirecting non admin users to rate page
    if (loggedInUser?.role != 'ADMIN_USER') {
        navigate(`/rates/${rateID}`)
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
