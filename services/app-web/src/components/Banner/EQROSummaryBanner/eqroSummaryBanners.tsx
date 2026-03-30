import React from 'react'
import styles from '../Banner.module.scss'
import { AccessibleAlertBanner } from '../AccessibleAlertBanner/AccessibleAlertBanner'
import { ExpandableText } from '../../ExpandableText'

interface EqroSummaryBannerProps {
    className?: string
    subjectToReview: boolean
    stateUser: boolean
}

const StateSubjectToReviewText = (): React.ReactElement => {
    return (
        <div className={styles.bannerBodyText}>
            <p className="usa-alert__text">
                Based on your responses, this submission is subject to formal
                review and approval.
            </p>
            <p className="usa-alert__text">What comes next:</p>
            <ul className="usa-alert__text">
                <li>
                    <strong>Check for completeness:</strong> CMS will review all
                    documentation submitted to ensure all required materials
                    were received, and the state submission history is complete.
                </li>
                <li>
                    <strong>CMS review:</strong> Your submission will be
                    reviewed by CMS for adherence to federal regulations.
                </li>
                <li>
                    <strong>Questions:</strong> You may receive questions via
                    email from CMS as they conduct their review.
                </li>
                <li>
                    <strong>Determination:</strong> Once all questions have been
                    addressed, CMS will contact you with their final
                    determination.
                </li>
            </ul>
        </div>
    )
}

const StateNotSubjectToReviewText = (): React.ReactElement => {
    return (
        <div className={styles.bannerBodyText}>
            <p className="usa-alert__text">
                Based on the state's responses, this submission is not subject
                to formal review and approval.
            </p>
            <p className="usa-alert__text">
                <strong>As a reminder, all contracts with EQROs must:</strong>
            </p>
            <ul className="usa-alert__text">
                <li>
                    Be submitted to CMS. This includes base contracts,
                    amendments to base contracts, and extensions.
                </li>
                <li>
                    Meet competence and independence requirements specified at
                    42 CFR 438.354 to qualify for Federal Financial
                    Participation (FFP).
                </li>
                <li>
                    Require the mandatory review activities specified at 42 CFR
                    438.358 for MCOs, PIHPs, and PAHPs.
                </li>
            </ul>
        </div>
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

export const EqroReviewDeterminationBanners = ({
    className,
    subjectToReview,
    stateUser,
}: EqroSummaryBannerProps): React.ReactElement => {
    return (
        <AccessibleAlertBanner
            role="status"
            type="info"
            heading={
                subjectToReview ? 'Subject to review' : 'Not subject to review'
            }
            headingLevel="h4"
            data-testid="eqroSummaryBanner"
            className={className}
        >
            <ExpandableText>
                {stateUser ? (
                    subjectToReview ? (
                        <StateSubjectToReviewText />
                    ) : (
                        <StateNotSubjectToReviewText />
                    )
                ) : (
                    <CMSReviewBanner subjectToReview={subjectToReview} />
                )}
            </ExpandableText>
        </AccessibleAlertBanner>
    )
}
