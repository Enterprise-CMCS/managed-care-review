import { GridContainer, Icon } from '@trussworks/react-uswds'
import React, { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
    ButtonWithLogging,
    DoubleColumnGrid,
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
import { SingleRateSummarySection } from '../../components/SubmissionSummarySection/RateDetailsSummarySection/SingleRateSummarySection'
import { useAuth } from '../../contexts/AuthContext'
import { ErrorForbiddenPage } from '../Errors/ErrorForbiddenPage'
import { Error404 } from '../Errors/Error404Page'
import { RateReplacedBanner, RateWithdrawBanner } from '../../components/Banner'
import { hasCMSUserPermissions } from '@mc-review/helpers'
import { useLDClient } from 'launchdarkly-react-client-sdk'
import { featureFlags } from '@mc-review/common-code'
import { UnlockRateButton } from '../../components/SubmissionSummarySection/RateDetailsSummarySection/UnlockRateButton'
import { recordJSException } from '@mc-review/otel'
import { handleApolloErrorsAndAddUserFacingMessages } from '@mc-review/helpers'
import { StatusUpdatedBanner } from '../../components/Banner/StatusUpdatedBanner/StatusUpdatedBanner'

export const RateSummary = (): React.ReactElement => {
    // Page level state
    const { loggedInUser } = useAuth()
    const { updateHeading } = usePage()
    const navigate = useNavigate()
    const [rateName, setRateName] = useState<string | undefined>(undefined)
    const [searchParams, setSearchParams] = useSearchParams()
    const [showUndoWithdrawBanner, setUndowWithdrawBanner] =
        useState<boolean>(false)
    const { id } = useParams() as { id: string }

    useEffect(() => {
        if (searchParams.get('showUndoWithdrawBanner') === 'true') {
            setUndowWithdrawBanner(true)

            //This ensures the banner goes away upon refresh or navigation
            searchParams.delete('showUndoWithdrawBanner')
            setSearchParams(searchParams, { replace: true })
        }
    }, [searchParams, setSearchParams])

    useEffect(() => {
        updateHeading({ customHeading: rateName })
    }, [rateName, updateHeading])

    const isStateUser = loggedInUser?.role === 'STATE_USER'
    const isCMSUser = hasCMSUserPermissions(loggedInUser)

    const ldClient = useLDClient()
    const showRateUnlock: boolean = ldClient?.variation(
        featureFlags.RATE_EDIT_UNLOCK.flag,
        featureFlags.RATE_EDIT_UNLOCK.defaultValue
    )
    const showWithdrawRate: boolean = ldClient?.variation(
        featureFlags.WITHDRAW_RATE.flag,
        featureFlags.WITHDRAW_RATE.defaultValue
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

    const currentRateRev = rate.revisions[0]
    const withdrawInfo = rate.withdrawInfo

    // Redirecting a state user to the edit page if rate is unlocked
    if (
        data &&
        loggedInUser?.role === 'STATE_USER' &&
        rate.status === 'UNLOCKED'
    ) {
        navigate(`/rates/${id}/edit`)
    }

    if (
        rateName !== currentRateRev.formData.rateCertificationName &&
        currentRateRev.formData.rateCertificationName
    ) {
        setRateName(currentRateRev.formData.rateCertificationName)
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

    const parentContractSubmissionID = rate.parentContractID
    const isUnlocked = rate.status === 'UNLOCKED'
    const isWithdrawn = rate.consolidatedStatus === 'WITHDRAWN'
    const parentContractIsApproved = contract.consolidatedStatus === 'APPROVED'
    const parentContractIsSubmitted =
        contract.consolidatedStatus === 'SUBMITTED' ||
        contract.consolidatedStatus === 'RESUBMITTED'
    const latestRateAction = rate.reviewStatusActions?.[0]
    const showWithdrawBanner =
        showWithdrawRate && latestRateAction && isWithdrawn
    const showWithdrawRateBtn =
        showWithdrawRate && !isWithdrawn && !parentContractIsApproved
    const showUndoWithdrawRateBtn =
        showUndoWithdrawRate && isWithdrawn && parentContractIsSubmitted

    return (
        <div className={styles.background}>
            <GridContainer
                data-testid="rate-summary"
                className={styles.container}
            >
                {withdrawInfo && (
                    <RateReplacedBanner
                        withdrawInfo={withdrawInfo}
                        className={styles.banner}
                    />
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
                        <DoubleColumnGrid>
                            {showRateUnlock ? (
                                <UnlockRateButton
                                    disabled={
                                        isUnlocked ||
                                        unlockLoading ||
                                        parentContractIsApproved ||
                                        isWithdrawn
                                    }
                                    onClick={handleUnlockRate}
                                >
                                    Unlock rate
                                </UnlockRateButton>
                            ) : (
                                /* This second option is an interim state for unlock rate button (when linked rates is turned on but unlock and edit rate is not available yet). Remove when rate unlock is permanently on. */
                                <UnlockRateButton
                                    disabled={
                                        isUnlocked ||
                                        unlockLoading ||
                                        parentContractIsApproved ||
                                        isWithdrawn
                                    }
                                    onClick={() => {
                                        navigate(
                                            `/submissions/${parentContractSubmissionID}`
                                        )
                                    }}
                                    link_url={`/submissions/${parentContractSubmissionID}`}
                                >
                                    Unlock rate
                                </UnlockRateButton>
                            )}
                            {showWithdrawRateBtn && (
                                <ButtonWithLogging
                                    disabled={isUnlocked}
                                    className="usa-button usa-button--outline"
                                    type="button"
                                    onClick={() =>
                                        navigate(
                                            `/rate-reviews/${rate.id}/withdraw-rate`
                                        )
                                    }
                                    link_url={`/rate-reviews/${rate.id}/withdraw-rate`}
                                    outline
                                >
                                    Withdraw rate
                                </ButtonWithLogging>
                            )}
                            {showUndoWithdrawRateBtn && (
                                <ButtonWithLogging
                                    disabled={isUnlocked}
                                    className="usa-button usa-button--outline"
                                    type="button"
                                    onClick={() =>
                                        navigate(
                                            `/rate-reviews/${rate.id}/undo-withdraw`
                                        )
                                    }
                                    link_url={`/rate-reviews/${rate.id}/undo-withdraw`}
                                    outline
                                >
                                    Undo withdraw
                                </ButtonWithLogging>
                            )}
                        </DoubleColumnGrid>
                    </SectionCard>
                )}
                <SingleRateSummarySection
                    rate={rate}
                    isSubmitted // can assume isSubmitted because we redirect for unlocked
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
