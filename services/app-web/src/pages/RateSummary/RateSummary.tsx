import { GridContainer, Icon } from '@trussworks/react-uswds'
import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
    ButtonWithLogging,
    DoubleColumnGrid,
    Loading,
    NavLinkWithLogging,
    SectionCard,
} from '../../components'
import { usePage } from '../../contexts/PageContext'
import {
    useFetchRateQuery,
    useFetchContractQuery,
    useUnlockRateMutation,
} from '../../gen/gqlClient'
import styles from '../SubmissionSummary/SubmissionSummary.module.scss'
import { GenericErrorPage } from '../Errors/GenericErrorPage'
import { ERROR_MESSAGES, RoutesRecord } from '@mc-review/constants'
import { SingleRateSummarySection } from '../../components/SubmissionSummarySection/RateDetailsSummarySection/SingleRateSummarySection'
import { useAuth } from '../../contexts/AuthContext'
import { ErrorForbiddenPage } from '../Errors/ErrorForbiddenPage'
import { Error404 } from '../Errors/Error404Page'
import { RateWithdrawnBanner } from '../../components/Banner'
import { hasCMSUserPermissions } from '@mc-review/helpers'
import { useLDClient } from 'launchdarkly-react-client-sdk'
import { featureFlags } from '@mc-review/common-code'
import { UnlockRateButton } from '../../components/SubmissionSummarySection/RateDetailsSummarySection/UnlockRateButton'
import { recordJSException } from '@mc-review/otel'
import { handleApolloErrorsAndAddUserFacingMessages } from '@mc-review/helpers'

export const RateSummary = (): React.ReactElement => {
    // Page level state
    const { loggedInUser } = useAuth()
    const { updateHeading } = usePage()
    const navigate = useNavigate()
    const [rateName, setRateName] = useState<string | undefined>(undefined)
    const { id } = useParams() as { id: string }

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
    const [unlockRate, { loading: unlockLoading }] = useUnlockRateMutation()

    const { data, loading, error } = useFetchRateQuery({
        variables: {
            input: {
                rateID: id,
            },
        },
    })

    const rate = data?.fetchRate.rate
    const {
        data: fetchContractData,
        loading: loadingContract,
        error: fetchContractError,
    } = useFetchContractQuery({
        variables: {
            input: {
                contractID: rate?.parentContractID ?? 'unknown-contract',
            },
        },
    })
    const currentRateRev = rate?.revisions[0]
    const withdrawInfo = rate?.withdrawInfo

    if (loading) {
        return (
            <GridContainer>
                <Loading />
            </GridContainer>
        )
    } else if (error || !rate || !currentRateRev?.formData) {
        //error handling for a state user that tries to access rates for a different state
        if (error?.graphQLErrors[0]?.extensions?.code === 'FORBIDDEN') {
            return (
                <ErrorForbiddenPage errorMsg={error.graphQLErrors[0].message} />
            )
        } else if (error?.graphQLErrors[0]?.extensions?.code === 'NOT_FOUND') {
            return <Error404 />
        } else {
            return <GenericErrorPage />
        }
    }

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

    if (loadingContract) {
        return (
            <GridContainer>
                <Loading />
            </GridContainer>
        )
    } else if (fetchContractError || !contract) {
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
    const parentContractIsApproved = contract.consolidatedStatus === 'APPROVED'

    return (
        <div className={styles.background}>
            <GridContainer
                data-testid="rate-summary"
                className={styles.container}
            >
                {withdrawInfo && (
                    <RateWithdrawnBanner
                        withdrawInfo={withdrawInfo}
                        className={styles.banner}
                    />
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
                                        parentContractIsApproved
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
                                        parentContractIsApproved
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
                            {showWithdrawRate && (
                                <ButtonWithLogging
                                    disabled={isUnlocked}
                                    className="usa-button usa-button--outline"
                                    type="button"
                                    onClick={() => navigate('./')}
                                    link_url={'./'}
                                    outline
                                >
                                    Withdraw rate
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
