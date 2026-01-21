import { Grid, GridContainer, Icon } from '@trussworks/react-uswds'
import React, { useEffect, useLayoutEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
    ButtonWithLogging,
    MultiColumnGrid,
    Loading,
    NavLinkWithLogging,
    SectionCard,
} from '../../components'
import { usePage } from '../../contexts/PageContext'
import {
    useFetchContractQuery,
    useUnlockRateMutation,
    useFetchRateWithQuestionsQuery,
} from '../../gen/gqlClient'
import styles from '../SubmissionSummary/SubmissionSummary.module.scss'
import { GenericErrorPage } from '../Errors/GenericErrorPage'
import { ERROR_MESSAGES, RoutesRecord } from '@mc-review/constants'
import { SingleRateSummarySection } from '../../components/SubmissionSummarySection'
import { useAuth } from '../../contexts/AuthContext'
import { ErrorForbiddenPage } from '../Errors/ErrorForbiddenPage'
import { Error404 } from '../Errors/Error404Page'
import {
    IncompleteSubmissionBanner,
    RateWithdrawBanner,
} from '../../components/Banner'
import { hasCMSUserPermissions } from '@mc-review/helpers'
import { useLDClient } from 'launchdarkly-react-client-sdk'
import { featureFlags } from '@mc-review/common-code'
import { UnlockRateButton } from '../../components/SubmissionSummarySection/RateDetailsSummarySection/UnlockRateButton'
import { recordJSException } from '@mc-review/otel'
import { handleApolloErrorsAndAddUserFacingMessages } from '@mc-review/helpers'
import { StatusUpdatedBanner } from '../../components/Banner'
import { ChildrenType } from '../../components/MultiColumnGrid/MultiColumnGrid'
import { getSubmissionPath } from '../../routeHelpers'
import { useMemoizedStateHeader } from '../../hooks'

export const RateSummary = (): React.ReactElement => {
    // Page level state
    const { loggedInUser } = useAuth()
    const { updateHeading, updateActiveMainContent } = usePage()
    const navigate = useNavigate()
    const [searchParams, setSearchParams] = useSearchParams()
    const [showUndoWithdrawBanner, setUndowWithdrawBanner] =
        useState<boolean>(false)
    const { id } = useParams() as {
        id: string
    }

    useEffect(() => {
        if (searchParams.get('showUndoWithdrawBanner') === 'true') {
            setUndowWithdrawBanner(true)

            //This ensures the banner goes away upon refresh or navigation
            searchParams.delete('showUndoWithdrawBanner')
            setSearchParams(searchParams, { replace: true })
        }
    }, [searchParams, setSearchParams])

    const isStateUser = loggedInUser?.role === 'STATE_USER'
    const isCMSUser = hasCMSUserPermissions(loggedInUser)

    const ldClient = useLDClient()
    const showRateUnlock: boolean = ldClient?.variation(
        featureFlags.RATE_EDIT_UNLOCK.flag,
        featureFlags.RATE_EDIT_UNLOCK.defaultValue
    )
    const showUndoWithdrawRate: boolean = ldClient?.variation(
        featureFlags.UNDO_WITHDRAW_RATE.flag,
        featureFlags.UNDO_WITHDRAW_RATE.defaultValue
    )
    const [unlockRate, { loading: unlockLoading }] = useUnlockRateMutation()

    const { data, loading, error } = useFetchRateWithQuestionsQuery({
        variables: {
            input: {
                rateID: id,
            },
        },
        fetchPolicy: 'cache-and-network',
    })
    const rate = data?.fetchRate.rate

    const {
        data: fetchContractData,
        loading: fetchContractLoading,
        error: fetchContractError,
    } = useFetchContractQuery({
        variables: {
            input: {
                contractID: rate?.parentContractID ?? 'unknown-contract',
            },
        },
        fetchPolicy: 'cache-and-network',
    })
    const activeMainContentId = 'rateSummaryPageMainContent'

    // Set the active main content to focus when click the Skip to main content button.
    useEffect(() => {
        updateActiveMainContent(activeMainContentId)
    }, [activeMainContentId, updateActiveMainContent])

    const stateHeader = useMemoizedStateHeader({
        subHeaderText:
            rate?.revisions[0].formData.rateCertificationName ?? undefined,
        stateCode: fetchContractData?.fetchContract.contract.state.code,
        stateName: fetchContractData?.fetchContract.contract.state.name,
    })

    useLayoutEffect(() => {
        updateHeading({ customHeading: stateHeader })
    }, [updateHeading, stateHeader])

    // Handle loading and error states for fetching data while using cached data
    if (!data && loading) {
        return (
            <GridContainer>
                <Loading />
            </GridContainer>
        )
    } else if (!data && error) {
        if (error?.graphQLErrors[0]?.extensions?.code === 'FORBIDDEN') {
            return (
                <ErrorForbiddenPage errorMsg={error.graphQLErrors[0].message} />
            )
        } else if (error?.graphQLErrors[0]?.extensions?.code === 'NOT_FOUND') {
            return <Error404 />
        } else {
            return <GenericErrorPage />
        }
    } else if (!rate) {
        return <GenericErrorPage />
    }

    // Redirecting a state user to the edit page if rate is unlocked
    if (
        data &&
        loggedInUser?.role === 'STATE_USER' &&
        rate.status === 'UNLOCKED'
    ) {
        navigate(`/rates/${id}/edit`)
    }

    const contract = fetchContractData?.fetchContract.contract

    // Handle loading and error states for fetching data while using cached data
    if (!fetchContractData && fetchContractLoading) {
        return (
            <GridContainer>
                <Loading />
            </GridContainer>
        )
    } else if (fetchContractError && !fetchContractData) {
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
    } else if (!contract) {
        return <GenericErrorPage />
    }

    const handleUnlockRate = async () => {
        try {
            const { data } = await unlockRate({
                variables: {
                    input: {
                        rateID: rate.id,
                        unlockedReason: '',
                    },
                },
            })

            if (data?.unlockRate.rate) {
                // don't do anything, eventually this entire function will be in the modal
            } else {
                recordJSException(
                    `[UNEXPECTED]: Error attempting to unlock rate, no data present.`
                )
                return new Error(ERROR_MESSAGES.unlock_error_generic)
            }
        } catch (error) {
            return handleApolloErrorsAndAddUserFacingMessages(
                error,
                'UNLOCK_RATE'
            )
        }
    }

    const latestRateAction = rate.reviewStatusActions?.[0]
    const latestPackageSubmission = rate.packageSubmissions?.[0]

    const parentContractSubmissionID = rate.parentContractID
    const isUnlocked = rate.consolidatedStatus === 'UNLOCKED'
    const isWithdrawn = rate.consolidatedStatus === 'WITHDRAWN'
    const parentContractIsSubmitted =
        contract.consolidatedStatus === 'SUBMITTED' ||
        contract.consolidatedStatus === 'RESUBMITTED'
    const parentContractIsWithdrawn =
        contract.consolidatedStatus === 'WITHDRAWN'
    const isWithdrawnWithContract =
        isWithdrawn &&
        parentContractIsWithdrawn &&
        !rate.withdrawnFromContracts?.find(
            (contract) => contract.id === rate.parentContractID
        )

    // Orphaned rates are ones not associated with any contracts in its latest packageSubmission and withdrawnFromContracts.
    // Contracts the rate was removed from must be resubmitted before the latest packageSubmission will show the disassociation.
    const isOrphanedRate =
        latestPackageSubmission &&
        latestPackageSubmission.contractRevisions.length === 0 &&
        rate.withdrawnFromContracts?.length === 0

    const showWithdrawBanner = latestRateAction && isWithdrawn

    const rateActions: ChildrenType[] = []

    // Adding Unlock rate button to action section
    if (
        showRateUnlock &&
        !isWithdrawn &&
        !isUnlocked &&
        parentContractIsSubmitted
    ) {
        rateActions.push(
            <UnlockRateButton
                key="unlock-rate-button"
                disabled={unlockLoading}
                onClick={handleUnlockRate}
            >
                Unlock rate
            </UnlockRateButton>
        )
    } else if (!isWithdrawn && !isUnlocked && parentContractIsSubmitted) {
        rateActions.push(
            /* This second option is an interim state for unlock rate button (when linked rates is turned on but unlock and edit rate is not available yet). Remove when rate unlock is permanently on. */
            <UnlockRateButton
                key="unlock-rate-button"
                onClick={() => {
                    navigate(
                        getSubmissionPath(
                            'SUBMISSIONS_SUMMARY',
                            contract?.contractSubmissionType,
                            parentContractSubmissionID
                        )
                    )
                }}
                link_url={getSubmissionPath(
                    'SUBMISSIONS_SUMMARY',
                    contract?.contractSubmissionType,
                    parentContractSubmissionID
                )}
            >
                Unlock rate
            </UnlockRateButton>
        )
    }

    // Adding undo withdraw button to action section
    if (
        showUndoWithdrawRate &&
        isWithdrawn &&
        !isWithdrawnWithContract &&
        parentContractIsSubmitted &&
        !isOrphanedRate
    ) {
        rateActions.push(
            <ButtonWithLogging
                key="withdraw-rate-button"
                className="usa-button usa-button--outline"
                type="button"
                onClick={() =>
                    navigate(`/rate-reviews/${rate.id}/undo-withdraw`)
                }
                link_url={`/rate-reviews/${rate.id}/undo-withdraw`}
                outline
            >
                Undo withdraw
            </ButtonWithLogging>
        )
    }

    // Adding withdraw button to action section
    if (
        (!isWithdrawn &&
            (parentContractIsSubmitted || parentContractIsWithdrawn)) ||
        (!isWithdrawn && isOrphanedRate)
    ) {
        rateActions.push(
            <ButtonWithLogging
                key="undo-withdraw-rate-button"
                className="usa-button usa-button--outline"
                type="button"
                onClick={() =>
                    navigate(`/rate-reviews/${rate.id}/withdraw-rate`)
                }
                link_url={`/rate-reviews/${rate.id}/withdraw-rate`}
                outline
            >
                Withdraw rate
            </ButtonWithLogging>
        )
    }

    return (
        <div className={styles.background} id={activeMainContentId}>
            <GridContainer
                data-testid="rate-summary"
                className={styles.container}
            >
                {isOrphanedRate && (
                    <IncompleteSubmissionBanner message="This rate is missing a contract action" />
                )}
                {showWithdrawBanner && (
                    <RateWithdrawBanner
                        updatedAt={latestRateAction.updatedAt}
                        updatedBy={latestRateAction.updatedBy}
                        reasonForWithdraw={latestRateAction.updatedReason}
                    />
                )}
                {showUndoWithdrawBanner && (
                    //Show status updated banner after undoing rate withdraw
                    <StatusUpdatedBanner />
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

                {isCMSUser && (
                    <SectionCard className={styles.actionsSection}>
                        <h3>Actions</h3>
                        {rateActions.length === 0 ? (
                            <Grid>
                                No action can be taken on this submission in its
                                current status.
                            </Grid>
                        ) : (
                            <MultiColumnGrid
                                columns={2}
                                children={rateActions}
                            />
                        )}
                    </SectionCard>
                )}
                <SingleRateSummarySection
                    rate={rate}
                    contractSubmissionType={contract.contractSubmissionType}
                    isSubmitted // can assume isSubmitted because we redirect for unlocked
                    statePrograms={rate.state.programs}
                />
            </GridContainer>
        </div>
    )
}
