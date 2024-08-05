import { GridContainer } from '@trussworks/react-uswds'
import React, { useEffect, } from 'react'
import { useParams } from 'react-router-dom'
import { usePage } from '../../contexts/PageContext'
import { useFetchContractQuery } from '../../gen/gqlClient'
import styles from '../SubmissionSummary/SubmissionSummary.module.scss'
import { ErrorOrLoadingPage, handleAndReturnErrorState } from '../../pages/StateSubmission/ErrorOrLoadingPage'
import { useAuth } from '../../contexts/AuthContext'

export const ReplaceRate = (): React.ReactElement => {
    // Page level state
    const { loggedInUser } = useAuth()
    const { updateHeading } = usePage()
    const { id, rateID} = useParams()
    if (!id) {
        throw new Error('PROGRAMMING ERROR: id param not set')
    }
    if (loggedInUser?.role != 'ADMIN_USER') {
        return <ErrorOrLoadingPage state="FORBIDDEN" />
    }

    // API handling
    const {  data: initialData, loading: initialRequestLoading, error: initialRequestError } = useFetchContractQuery({
        variables: {
            input: {
                contractID: id ?? 'unknown contract',
            },
        },
    })

    // const [replaceRate, {data: replaceData, loading: replaceLoading, error: replaceError}] = useWithdrawAndReplaceRedundantRateMutation(

    const contract =  initialData?.fetchContract.contract
    const contractName = contract?.packageSubmissions[0].contractRevision.contractName
    const withdrawnRateRevisionName =  contract?.packageSubmissions[0].rateRevisions.find( rateRev => rateRev.rateID == rateID)?.formData.rateCertificationName

    useEffect(() => {
        updateHeading({ customHeading: contractName })
    }, [contractName, updateHeading])


    if (initialRequestLoading) {
        return <ErrorOrLoadingPage state="LOADING" />
    }

    if (initialRequestError) {
        return (
            <ErrorOrLoadingPage
                state={handleAndReturnErrorState(initialRequestError)}
            />
        )
    }

    return (
        <div className={styles.backgroundFullPage}>
            <GridContainer
                data-testid="rate-summary"
                className={styles.container}
            >
                <h2>{withdrawnRateRevisionName}</h2>
            </GridContainer>
        </div>
    )
}

export type SectionHeaderProps = {
    header: string
    submissionName?: boolean
    href: string
}
