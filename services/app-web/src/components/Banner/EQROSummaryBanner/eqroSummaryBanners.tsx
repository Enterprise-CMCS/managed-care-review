import React from 'react'
import styles from '../Banner.module.scss'
import { AccessibleAlertBanner } from '../AccessibleAlertBanner/AccessibleAlertBanner'
import { ExpandableText } from '../../ExpandableText'
import { ReviewDecisionRecord } from '@mc-review/constants'

import { getUpdatedByDisplayName } from '@mc-review/helpers'
import { formatBannerDate } from '@mc-review/dates'
import { UpdateInformation } from '../../../gen/gqlClient'

interface EqroSummaryBannerProps {
    className?: string
    subjectToReview: boolean
    stateUser: boolean
    updateInfo?: UpdateInformation
}

const whatComesNextBodyContent = () => (
    <>
        <p className="usa-alert__text">
            <strong>What comes next:</strong>
        </p>
        <ul>
            <li>
                <strong>Check for completeness:</strong> CMS will review all
                documentation submitted to ensure all required materials were
                received, and the state submission history is complete.
            </li>
            <li>
                <strong>CMS review:</strong> Your submission will be reviewed by
                CMS for adherence to federal regulations.
            </li>
            <li>
                <strong>Questions:</strong> You may receive questions via email
                from CMS as they conduct their review.
            </li>
            <li>
                <strong>Determination:</strong> Once all questions have been
                addressed, CMS will contact you with their final determination.
            </li>
        </ul>
    </>
)

const eqrpReminderBodyContent = () => (
    <>
        <p className="usa-alert__text">
            <strong>As a reminder, all contracts with EQROs must:</strong>
        </p>
        <ul>
            <li>
                Be submitted to CMS. This includes base contracts, amendments to
                base contracts, and extensions.
            </li>
            <li>
                Meet competence and independence requirements specified at 42
                CFR 438.354 to qualify for Federal Financial Participation
                (FFP).
            </li>
            <li>
                Require the mandatory review activities specified at 42 CFR
                438.358 for MCOs, PIHPs, and PAHPs.
            </li>
        </ul>
    </>
)

const StateSubjectToReviewText = (): React.ReactElement => {
    return (
        <>
            <p className="usa-alert__text">
                Based on your responses, this submission is subject to formal
                review and approval.
            </p>
            <ExpandableText clampedLines={1}>
                {whatComesNextBodyContent()}
            </ExpandableText>
        </>
    )
}

const StateNotSubjectToReviewText = (): React.ReactElement => {
    return (
        <>
            <p className="usa-alert__text">
                Based on the state's responses, this submission is not subject
                to formal review and approval.
            </p>
            <ExpandableText clampedLines={1}>
                {eqrpReminderBodyContent()}
            </ExpandableText>
        </>
    )
}

const CMSReviewBanner = ({
    subjectToReview,
}: {
    subjectToReview: boolean
}): React.ReactElement => {
    return subjectToReview ? (
        <p className="usa-alert__text">
            Based on the state's responses, this submission is subject to formal
            review and approval.
        </p>
    ) : (
        <p className="usa-alert__text">
            Based on the state's responses, this submission is not subject to
            formal review and approval review.
        </p>
    )
}

const SubmissionUpdatedBody = ({
    updateInfo,
    subjectToReview,
    stateUser,
}: {
    updateInfo: UpdateInformation
    subjectToReview: boolean
    stateUser: boolean
}) => {
    const additionalText = subjectToReview
        ? whatComesNextBodyContent()
        : eqrpReminderBodyContent()

    return (
        <>
            <p className="usa-alert__text">
                <b>Submitted by:&nbsp;</b>
                {getUpdatedByDisplayName(updateInfo?.updatedBy)}
            </p>
            <p className="usa-alert__text">
                <b>Updated on:&nbsp;</b>
                {formatBannerDate(updateInfo?.updatedAt)}
            </p>
            <p className="usa-alert__text">
                <b>Review decision:&nbsp;</b>
                {subjectToReview
                    ? ReviewDecisionRecord['UNDER_REVIEW']
                    : ReviewDecisionRecord['NOT_SUBJECT_TO_REVIEW']}
            </p>
            <ExpandableText>
                <p className="usa-alert__text">
                    <b>Summary of changes:&nbsp;</b>
                    {updateInfo?.updatedReason ?? 'Not available'}
                </p>
                {stateUser && (
                    <p className="usa-alert__text">{additionalText}</p>
                )}
            </ExpandableText>
        </>
    )
}

const InitialSubmissionBody = ({
    stateUser,
    subjectToReview,
}: {
    stateUser: boolean
    subjectToReview: boolean
}) => {
    if (!stateUser) {
        return <CMSReviewBanner subjectToReview={subjectToReview} />
    }
    return subjectToReview ? (
        <StateSubjectToReviewText />
    ) : (
        <StateNotSubjectToReviewText />
    )
}

export const EqroReviewDeterminationBanners = ({
    className,
    subjectToReview,
    stateUser,
    updateInfo,
}: EqroSummaryBannerProps): React.ReactElement => {
    const heading = updateInfo
        ? 'Submission updated'
        : subjectToReview
          ? ReviewDecisionRecord['UNDER_REVIEW']
          : ReviewDecisionRecord['NOT_SUBJECT_TO_REVIEW']
    return (
        <AccessibleAlertBanner
            role="status"
            type="info"
            heading={heading}
            headingLevel="h3"
            data-testid="eqroSummaryBanner"
            className={className}
            validation
        >
            <div className={styles.bannerBodyText}>
                {updateInfo ? (
                    <SubmissionUpdatedBody
                        subjectToReview={subjectToReview}
                        updateInfo={updateInfo}
                        stateUser={stateUser}
                    />
                ) : (
                    <InitialSubmissionBody
                        stateUser={stateUser}
                        subjectToReview={subjectToReview}
                    />
                )}
            </div>
        </AccessibleAlertBanner>
    )
}
