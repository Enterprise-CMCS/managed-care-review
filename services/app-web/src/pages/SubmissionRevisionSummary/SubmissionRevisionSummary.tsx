import React, { useEffect } from 'react'
import { GridContainer } from '@trussworks/react-uswds'
import { useParams } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import {
    ContractDetailsSummarySection,
    ContactsSummarySection,
    RateDetailsSummarySection,
    SubmissionTypeSummarySection,
} from '../../components/SubmissionSummarySection'
import { usePage } from '../../contexts/PageContext'
import { formatToPacificTime } from '@mc-review/dates'
import styles from './SubmissionRevisionSummary.module.scss'
import { PreviousSubmissionBanner } from '../../components'
import { useFetchContractQuery } from '../../gen/gqlClient'
import {
    ErrorOrLoadingPage,
    handleAndReturnErrorState,
} from '../StateSubmission/ErrorOrLoadingPage'
import { Error404 } from '../Errors/Error404Page'
import { hasCMSUserPermissions } from '@mc-review/helpers'

export const SubmissionRevisionSummary = (): React.ReactElement => {
    // Page level state
    const { id, revisionVersion } = useParams()
    if (!id) {
        throw new Error(
            'PROGRAMMING ERROR: id param not set in state submission form.'
        )
    }
    const { updateHeading } = usePage()
    const { loggedInUser } = useAuth()

    const isStateUser = loggedInUser?.role === 'STATE_USER'
    const hasCMSPermissions = hasCMSUserPermissions(loggedInUser)

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

    // Offset version by +1 of index, remove offset to find target previous submission in the history list
    const revisionIndex = Number(revisionVersion) - 1

    // Reverse revisions to get correct submission order
    const packageSubmissions = contract
        ? [...contract.packageSubmissions]
              .filter((submission) => {
                  return submission.cause === 'CONTRACT_SUBMISSION'
              })
              .reverse()
        : []
    const targetPreviousSubmission =
        packageSubmissions[revisionIndex] &&
        packageSubmissions[revisionIndex].__typename
            ? packageSubmissions[revisionIndex]
            : undefined
    const name = targetPreviousSubmission?.contractRevision.contractName

    useEffect(() => {
        // make sure you do not update the page heading until we are sure the name for that previous submission exists
        if (name) {
            updateHeading({
                customHeading: name,
            })
        }
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

    if (!contract || !targetPreviousSubmission || !name) {
        return <Error404 />
    }

    const revision = targetPreviousSubmission.contractRevision
    const rateRevisions = targetPreviousSubmission.rateRevisions.map((rrev) => {
        return {
            ...rrev,
            isLinked: false, // just ignore isLinked, we are on revision summary for submitted rate and don't care at this point UI wise
        }
    })
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
                <SubmissionTypeSummarySection
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
                                {`${formatToPacificTime(submitInfo?.updatedAt)} version`}
                            </p>
                        )
                    }
                />

                <ContractDetailsSummarySection
                    contract={contract}
                    submissionName={name}
                    isCMSUser={hasCMSPermissions}
                    isStateUser={isStateUser}
                    contractRev={revision}
                />

                {isContractActionAndRateCertification && (
                    <RateDetailsSummarySection
                        contract={contract}
                        contractRev={revision}
                        submissionName={name}
                        statePrograms={statePrograms}
                        rateRevisions={rateRevisions}
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
