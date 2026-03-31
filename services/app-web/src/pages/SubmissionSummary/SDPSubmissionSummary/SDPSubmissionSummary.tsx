import { gql, useQuery } from '@apollo/client'
import { GridContainer } from '@trussworks/react-uswds'
import { formatContractSubTypeForDisplay } from '@mc-review/common-code'
import { formatCalendarDate } from '@mc-review/dates'
import { typedStatePrograms } from '@mc-review/submissions'
import React, { useEffect, useLayoutEffect } from 'react'
import { Navigate, generatePath } from 'react-router-dom'
import {
    DataDetail,
    DataDetailContactField,
    Loading,
    SectionCard,
    SectionHeader,
    UploadedDocumentsTable,
} from '../../../components'
import { StatusTag } from '../../../components/ContractTable/ContractTable'
import { useAuth } from '../../../contexts/AuthContext'
import { usePage } from '../../../contexts/PageContext'
import { GenericDocument } from '../../../gen/gqlClient'
import { useMemoizedStateHeader, useRouteParams } from '../../../hooks'
import { Error404 } from '../../Errors/Error404Page'
import { ErrorForbiddenPage } from '../../Errors/ErrorForbiddenPage'
import { GenericErrorPage } from '../../Errors/GenericErrorPage'
import styles from '../SubmissionSummary.module.scss'
import { RoutesRecord } from '@mc-review/constants'

const FETCH_SDP_QUERY = gql`
    query fetchSDPSubmissionSummary($input: FetchSDPInput!) {
        fetchSDP(input: $input) {
            sdp {
                id
                status
                stateCode
                stateNumber
                mccrsID
                latestSubmittedRevision {
                    id
                    updatedAt
                    formData {
                        submissionType
                        programIDs
                        changesIncluded
                        ratingPeriodStart
                        ratingPeriodEnd
                        estimatedFederalShare
                        estimatedStateShare
                        automaticallyRenewed
                        stateContacts {
                            name
                            titleRole
                            email
                        }
                    }
                    sdpDocuments {
                        id
                        name
                        s3URL
                        sha256
                        dateAdded
                        downloadURL
                        s3BucketName
                        s3Key
                    }
                }
                relatedContracts {
                    id
                    stateCode
                    stateNumber
                    contractSubmissionType
                }
            }
        }
    }
`

const sdpSubmissionName = (stateCode: string, stateNumber: number) =>
    `MCR-${stateCode}-${String(stateNumber).padStart(4, '0')}-SDP`

const formatSubmissionType = (value?: string) => {
    switch (value) {
        case 'NEW_STATE_DIRECTED_PAYMENT_PREPRINT':
            return 'New state directed payment preprint'
        case 'AMENDMENT_TO_AN_APPROVED_PREPRINT':
            return 'Amendment to an approved preprint'
        case 'RENEWAL_FOR_NEW_RATING_PERIOD':
            return 'Renewal for new rating period'
        default:
            return 'Not provided'
    }
}

const formatChange = (value: string) => {
    switch (value) {
        case 'RATING_PERIOD':
            return 'Rating period'
        case 'PAYMENT_TYPE':
            return 'Payment type'
        case 'PROVIDER_TYPE':
            return 'Provider type'
        case 'QUALITY_METRICS_OR_BENCHMARKS':
            return 'Quality metrics or benchmarks'
        case 'OTHER':
            return 'Other'
        default:
            return value
    }
}

const formatProgramNames = (stateCode: string, programIDs: string[]) => {
    const programs =
        typedStatePrograms.states.find((state) => state.code === stateCode)
            ?.programs ?? []

    const selectedProgramNames = programIDs.map(
        (programID) =>
            programs.find((program) => program.id === programID)?.name ??
            'Unknown Program'
    )

    return selectedProgramNames.join(', ')
}

const formatDateRange = (startDate: string, endDate: string) =>
    `${formatCalendarDate(
        new Date(startDate),
        'America/Los_Angeles'
    )} to ${formatCalendarDate(new Date(endDate), 'America/Los_Angeles')}`

const formatAutoRenewed = (automaticallyRenewed: boolean) =>
    automaticallyRenewed ? 'Yes' : 'No'

const formatRelatedContractName = (contract: {
    stateCode: string
    stateNumber: number
    contractSubmissionType: 'HEALTH_PLAN' | 'EQRO'
}) =>
    `MCR-${contract.stateCode}-${String(contract.stateNumber).padStart(
        4,
        '0'
    )} (${formatContractSubTypeForDisplay(contract.contractSubmissionType)})`

export const SDPSubmissionSummary = (): React.ReactElement => {
    const { updateHeading, updateActiveMainContent } = usePage()
    const { loggedInUser } = useAuth()
    const { id } = useRouteParams()
    const activeMainContentId = 'sdpSubmissionSummaryPageMainContent'
    const isStateUser = loggedInUser?.role === 'STATE_USER'

    const { data, loading, error } = useQuery(FETCH_SDP_QUERY, {
        variables: {
            input: {
                sdpID: id ?? 'unknown-sdp',
            },
        },
        fetchPolicy: 'cache-and-network',
    })

    const sdp = data?.fetchSDP?.sdp
    const latestSubmittedRevision = sdp?.latestSubmittedRevision
    const stateName = sdp?.stateCode
        ? (typedStatePrograms.states.find(
              (state) => state.code === sdp.stateCode
          )?.name ?? sdp.stateCode)
        : undefined
    const submissionName =
        sdp && sdp.stateCode
            ? sdpSubmissionName(sdp.stateCode, sdp.stateNumber)
            : ''

    const stateHeader = useMemoizedStateHeader({
        subHeaderText: submissionName,
        stateCode: sdp?.stateCode,
        stateName,
        contractType: 'SDP',
    })

    useLayoutEffect(() => {
        updateHeading({ customHeading: stateHeader })
    }, [stateHeader, updateHeading])

    useEffect(() => {
        updateActiveMainContent(activeMainContentId)
    }, [activeMainContentId, updateActiveMainContent])

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
    } else if (!sdp || !loggedInUser) {
        return <GenericErrorPage />
    }

    if (isStateUser && sdp.status === 'DRAFT') {
        return (
            <Navigate
                to={generatePath(RoutesRecord.SUBMISSIONS_SDP_DETAILS, {
                    id: sdp.id,
                })}
            />
        )
    }

    if (isStateUser && sdp.status === 'UNLOCKED') {
        return (
            <Navigate
                to={generatePath(RoutesRecord.SUBMISSIONS_SDP_REVIEW_SUBMIT, {
                    id: sdp.id,
                })}
            />
        )
    }

    if (!latestSubmittedRevision) {
        return <GenericErrorPage />
    }

    return (
        <div className={styles.background} id={activeMainContentId}>
            <GridContainer
                data-testid="sdp-submission-summary"
                className={styles.container}
            >
                <StatusTag status={sdp.status} notStateUser={!isStateUser} />

                <h1 className={styles.eqroSummaryNameHeader}>
                    {submissionName}
                </h1>

                <SectionCard>
                    <SectionHeader
                        header="Submission details"
                        fontSize="38px"
                        hideBorderTop
                        hideBorderBottom
                    />
                    <dl>
                        <DataDetail
                            id="sdp-summary-submission-type"
                            label="Submission type"
                        >
                            {formatSubmissionType(
                                latestSubmittedRevision.formData.submissionType
                            )}
                        </DataDetail>
                        <DataDetail
                            id="sdp-summary-programs"
                            label="Programs this action covers"
                        >
                            {formatProgramNames(
                                sdp.stateCode,
                                latestSubmittedRevision.formData.programIDs
                            )}
                        </DataDetail>
                        <DataDetail
                            id="sdp-summary-changes"
                            label="Changes included in this preprint"
                        >
                            {latestSubmittedRevision.formData.changesIncluded
                                .map(formatChange)
                                .join(', ')}
                        </DataDetail>
                        <DataDetail
                            id="sdp-summary-rating-period"
                            label="Rating period for which this payment arrangement will apply"
                        >
                            {formatDateRange(
                                latestSubmittedRevision.formData
                                    .ratingPeriodStart,
                                latestSubmittedRevision.formData.ratingPeriodEnd
                            )}
                        </DataDetail>
                        <DataDetail
                            id="sdp-summary-fed-share"
                            label="Estimated federal share"
                        >
                            {latestSubmittedRevision.formData
                                .estimatedFederalShare || 'Not provided'}
                        </DataDetail>
                        <DataDetail
                            id="sdp-summary-state-share"
                            label="Estimated state share"
                        >
                            {latestSubmittedRevision.formData
                                .estimatedStateShare || 'Not provided'}
                        </DataDetail>
                        <DataDetail
                            id="sdp-summary-auto-renewed"
                            label="Is this payment arrangement renewed automatically?"
                        >
                            {formatAutoRenewed(
                                latestSubmittedRevision.formData
                                    .automaticallyRenewed
                            )}
                        </DataDetail>
                    </dl>
                </SectionCard>

                <SectionCard>
                    <SectionHeader
                        header="SDP details"
                        fontSize="38px"
                        hideBorderTop
                        hideBorderBottom
                    />
                    <dl>
                        <DataDetail
                            id="sdp-summary-related-contracts"
                            label="Related contracts"
                        >
                            {sdp.relatedContracts.length > 0
                                ? sdp.relatedContracts
                                      .map(formatRelatedContractName)
                                      .join(', ')
                                : 'No related contracts added'}
                        </DataDetail>
                    </dl>
                    <UploadedDocumentsTable
                        documents={
                            latestSubmittedRevision.sdpDocuments as GenericDocument[]
                        }
                        previousSubmissionDate={null}
                        caption="SDP documents"
                        documentCategory="SDP"
                        hideDynamicFeedback
                    />
                </SectionCard>

                <SectionCard>
                    <SectionHeader
                        header="State contacts"
                        fontSize="38px"
                        hideBorderTop
                        hideBorderBottom
                    />
                    <dl>
                        {latestSubmittedRevision.formData.stateContacts.length >
                        0 ? (
                            latestSubmittedRevision.formData.stateContacts.map(
                                (contact: any, index: number) => (
                                    <DataDetail
                                        key={`sdp-summary-contact-${index}`}
                                        id={`sdp-summary-contact-${index}`}
                                        label={`State contact ${index + 1}`}
                                    >
                                        <DataDetailContactField
                                            contact={contact}
                                        />
                                    </DataDetail>
                                )
                            )
                        ) : (
                            <DataDetail
                                id="sdp-summary-no-contacts"
                                label="State contacts"
                            >
                                Not provided
                            </DataDetail>
                        )}
                    </dl>
                </SectionCard>
            </GridContainer>
        </div>
    )
}
