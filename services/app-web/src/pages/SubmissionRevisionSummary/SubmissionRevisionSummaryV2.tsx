import React, { useEffect } from 'react'
import { GridContainer } from '@trussworks/react-uswds'
import { useParams } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { ContractDetailsSummarySectionV2 } from '../StateSubmission/ReviewSubmit/V2/ReviewSubmit/ContractDetailsSummarySectionV2'
import { ContactsSummarySection } from '../StateSubmission/ReviewSubmit/V2/ReviewSubmit/ContactsSummarySectionV2'
import { RateDetailsSummarySectionV2 } from '../StateSubmission/ReviewSubmit/V2/ReviewSubmit/RateDetailsSummarySectionV2'
import { SubmissionTypeSummarySectionV2 } from '../StateSubmission/ReviewSubmit/V2/ReviewSubmit/SubmissionTypeSummarySectionV2'
import { usePage } from '../../contexts/PageContext'
import { dayjs } from '../../common-code/dateHelpers'
import styles from './SubmissionRevisionSummary.module.scss'
import { PreviousSubmissionBanner } from '../../components'
import { useFetchContractQuery } from '../../gen/gqlClient'
import {
    ErrorOrLoadingPage,
    handleAndReturnErrorState,
} from '../StateSubmission/ErrorOrLoadingPage'
import { Error404 } from '../Errors/Error404Page'

type RouteParams = {
    id: string
    revisionVersion: string
}

export const SubmissionRevisionSummaryV2 = (): React.ReactElement => {
    // Page level state
    const { id, revisionVersion } = useParams<keyof RouteParams>()
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
    //We offset version by +1 of index, remove offset to find revision in revisions
    const revisionIndex =
        (contract &&
            [...contract.packageSubmissions].filter((submission) => {
                return submission.cause === 'CONTRACT_SUBMISSION'
            }).length - 1) ||
        0

    const name =
        contract &&
        contract?.packageSubmissions.length > Number(revisionVersion)
            ? contract.packageSubmissions.reverse()[revisionIndex]
                  .contractRevision.contractName
            : ''
    useEffect(() => {
        updateHeading({
            customHeading: name,
        })
    }, [name, updateHeading])

    // Display any full page interim state resulting from the initial fetch API requests
    if (fetchContractLoading) {
        return <ErrorOrLoadingPage state="LOADING" />
    }

    if (fetchContractError) {
        return (
            <ErrorOrLoadingPage
                state={handleAndReturnErrorState(fetchContractError)}
            />
        )
    }

    if (
        !contract ||
        contract.packageSubmissions.length <= Number(revisionVersion)
    ) {
        return <Error404 />
    }

    // Reversing revisions to get correct submission order
    // we offset the index by one so that our indices start at 1
    const packageSubmission = [...contract.packageSubmissions]
        .filter((submission) => {
            return submission.cause === 'CONTRACT_SUBMISSION'
        })
        .reverse()[revisionIndex]
    const revision = packageSubmission.contractRevision
    const rateRevisions = packageSubmission.rateRevisions
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
                    initiallySubmittedAt={contract.initiallySubmittedAt}
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
                        rateRevs={rateRevisions}
                    />
                )}
                <ContactsSummarySection
                    contract={contract}
                    contractRev={revision}
                    isStateUser={isStateUser}
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
