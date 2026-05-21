import React, { useLayoutEffect } from 'react'
import { GridContainer } from '@trussworks/react-uswds'
import { useParams } from 'react-router-dom'
import { useAuth } from '../../../contexts/AuthContext'
import {
    ContactsSummarySection,
    EQROContractDetailsSummarySection,
    EQROSubmissionTypeSummarySection,
} from '../../../components/SubmissionSummarySection'
import { usePage } from '../../../contexts/PageContext'
import { formatToPacificTime } from '@mc-review/dates'
import styles from '../SubmissionRevisionSummary.module.scss'
import { PreviousSubmissionBanner } from '../../../components'
import { FetchContractDocument } from '../../../gen/gqlClient'
import { useQuery } from '@apollo/client/react'
import {
    ErrorOrLoadingPage,
    handleAndReturnErrorState,
} from '../../StateSubmission/SharedSubmissionComponents/ErrorOrLoadingPage'
import { Error404 } from '../../Errors/Error404Page'
import { getSubmissionPath } from '../../../routeHelpers'
import { useMemoizedStateHeader } from '../../../hooks'

export const EQROSubmissionRevisionSummary = (): React.ReactElement => {
    const { id, revisionVersion } = useParams()
    if (!id) {
        throw new Error(
            'PROGRAMMING ERROR: id param not set in state submission form.'
        )
    }
    const { updateHeading } = usePage()
    const { loggedInUser } = useAuth()

    const isStateUser = loggedInUser?.role === 'STATE_USER'

    const {
        data: fetchContractData,
        loading: fetchContractLoading,
        error: fetchContractError,
    } = useQuery(FetchContractDocument, {
        variables: {
            input: {
                contractID: id ?? 'unknown-contract',
            },
        },
        fetchPolicy: 'cache-and-network',
    })
    const contract = fetchContractData?.fetchContract.contract

    const revisionIndex = Number(revisionVersion) - 1

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

    const stateHeader = useMemoizedStateHeader({
        subHeaderText: name,
        stateCode: contract?.state.code,
        stateName: contract?.state.name,
        contractType: contract?.contractSubmissionType,
    })

    useLayoutEffect(() => {
        updateHeading({ customHeading: stateHeader })
    }, [stateHeader, updateHeading])

    if (!fetchContractData && fetchContractLoading) {
        return <ErrorOrLoadingPage state="LOADING" />
    }

    if (!fetchContractData && fetchContractError) {
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
    const submitInfo = revision.submitInfo || undefined

    return (
        <div className={styles.background}>
            <GridContainer
                data-testid="submission-summary"
                className={styles.container}
            >
                <PreviousSubmissionBanner
                    className={styles.banner}
                    link={getSubmissionPath(
                        'SUBMISSIONS_SUMMARY',
                        contract.contractSubmissionType,
                        contract.id
                    )}
                />
                <EQROSubmissionTypeSummarySection
                    contract={contract}
                    contractRev={revision}
                    isStateUser={isStateUser}
                    headerText="Submission details"
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

                <EQROContractDetailsSummarySection
                    contract={contract}
                    contractRev={revision}
                />

                <ContactsSummarySection
                    contract={contract}
                    contractRev={revision}
                    isStateUser={isStateUser}
                />
            </GridContainer>
        </div>
    )
}
