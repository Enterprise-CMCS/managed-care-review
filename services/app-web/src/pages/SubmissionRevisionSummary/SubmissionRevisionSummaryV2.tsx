import React, { useEffect } from 'react'
import { GridContainer } from '@trussworks/react-uswds'
import { useParams } from 'react-router-dom'
import { Loading } from '../../components/Loading'
import { useAuth } from '../../contexts/AuthContext'
import { ContractDetailsSummarySectionV2 } from '../StateSubmission/ReviewSubmit/V2/ReviewSubmit/ContractDetailsSummarySectionV2'
import { ContactsSummarySection } from '../StateSubmission/ReviewSubmit/V2/ReviewSubmit/ContactsSummarySectionV2'
import { RateDetailsSummarySectionV2 } from '../StateSubmission/ReviewSubmit/V2/ReviewSubmit/RateDetailsSummarySectionV2'
import { SubmissionTypeSummarySectionV2 } from '../StateSubmission/ReviewSubmit/V2/ReviewSubmit/SubmissionTypeSummarySectionV2'
import { usePage } from '../../contexts/PageContext'
import { GenericErrorPage } from '../Errors/GenericErrorPage'
import { Error404 } from '../Errors/Error404Page'
import { dayjs } from '../../common-code/dateHelpers'
import styles from './SubmissionRevisionSummary.module.scss'
import { PreviousSubmissionBanner } from '../../components'
import {
    useFetchContractQuery,
} from '../../gen/gqlClient'
import { ErrorForbiddenPage } from '../Errors/ErrorForbiddenPage'

type RouteParams = {
    id: string
    revisionVersion: string
}

export const SubmissionRevisionSummaryV2 = (): React.ReactElement => {
    // Page level state
    const { id } = useParams<keyof RouteParams>()
    if (!id) {
        throw new Error(
            'PROGRAMMING ERROR: id param not set in state submission form.'
        )
    }
    const { updateHeading } = usePage()
    const { loggedInUser } = useAuth()

    const isStateUser = loggedInUser?.role === 'STATE_USER'
    const isCMSUser = loggedInUser?.role === 'CMS_USER'

    const {
        data: fetchContractData,
        loading: fetchContractLoading,
        error: fetchContractError,
    } = useFetchContractQuery({
        variables: {
            input: {
                contractID: id ?? 'unknown-contract',
            },
        },
        fetchPolicy: 'network-only',
    })
    const contract = fetchContractData?.fetchContract.contract
    const name =
        contract && contract?.packageSubmissions.length > 0
            ? contract.packageSubmissions[0].contractRevision.contractName
            : ''
    useEffect(() => {
        updateHeading({
            customHeading: name,
        })
    }, [name, updateHeading])

    if (fetchContractLoading) {
        return (
            <GridContainer>
                <Loading />
            </GridContainer>
        )
    } else if (
        fetchContractError ||
        !contract ||
        contract.packageSubmissions.length === 0
    ) {
        //error handling for a state user that tries to access rates for a different state
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

    //Reversing revisions to get correct submission order
    const revision = contract.packageSubmissions[0].contractRevision
    const contractData = revision.formData
    const statePrograms = contract.state.programs
    const submitInfo = revision.submitInfo || undefined

    const isContractActionAndRateCertification =
        contractData.submissionType === 'CONTRACT_AND_RATES'

    return (
        <div className={styles.background}>
            <GridContainer
                data-testid="submission-summary"
                className={styles.container}
            >
                <PreviousSubmissionBanner link={`/submissions/${id}`} />

                <SubmissionTypeSummarySectionV2
                    contract={contract}
                    contractRev={revision}
                    statePrograms={statePrograms}
                    isStateUser={isStateUser}
                    submissionName={name}
                    headerChildComponent={
                        submitInfo && (
                            <p
                                className={styles.submissionVersion}
                                data-testid="revision-version"
                            >
                                {`${dayjs
                                    .utc(submitInfo?.updatedAt)
                                    .tz('America/New_York')
                                    .format('MM/DD/YY h:mma')} ET version`}
                            </p>
                        )
                    }
                />

                <ContractDetailsSummarySectionV2
                    contract={contract}
                    submissionName={name}
                    isCMSUser={isCMSUser}
                    isStateUser={isStateUser}
                    contractRev={revision}
                />

                {isContractActionAndRateCertification && (
                    <RateDetailsSummarySectionV2
                        contract={contract}
                        contractRev={revision}
                        submissionName={name}
                        statePrograms={statePrograms}
                    />
                )}
                <ContactsSummarySection contract={contract} contractRev={revision} isStateUser={isStateUser} />
            </GridContainer>
        </div>
    )
}

export type SectionHeaderProps = {
    header: string
    submissionName?: boolean
    href: string
}
