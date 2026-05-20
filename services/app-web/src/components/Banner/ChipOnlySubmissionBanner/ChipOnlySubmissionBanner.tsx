import React from 'react'
import styles from './ChipOnlySubmissionBanner.module.scss'
import { AccessibleAlertBanner } from '../AccessibleAlertBanner/AccessibleAlertBanner'
import { ExpandableText } from '../../ExpandableText'

export const ChipOnlySubmissionBanner = ({
    className,
}: React.HTMLAttributes<HTMLDivElement>): React.ReactElement => {
    return (
        <AccessibleAlertBanner
            type="info"
            heading="Not subject to review"
            headingLevel="h4"
            validation={true}
            data-testid="chipOnlySubmissionBanner"
            className={className}
        >
            <div className={styles.chipOnlyBanner}>
                <ExpandableText>
                    <p className={styles.subHeader}>
                        Because this submission covers a CHIP-only population,
                        DMCO won't validate that it meets federal requirements.
                    </p>
                    <strong>
                        For all CHIP-only contracts, you must still:
                    </strong>
                    <ul className={styles.listItems}>
                        <li>
                            Meet all applicable requirements at 42 CFR Part 457,
                            Subpart L.
                        </li>
                        <li>
                            Submit base contracts, amendments, and extensions to
                            CMS, as specified at 42 CFR § 457.1201(a).
                        </li>
                    </ul>
                    <strong>What comes next:</strong>
                    <ul className={styles.listItems}>
                        <li>
                            Recordkeeping: CMS will keep your submission on
                            file. DMCO doesn’t issue formal communication for
                            CHIP-only contracts.
                        </li>
                        <li>
                            Questions: Other CMS components may email you with
                            questions.
                        </li>
                    </ul>
                </ExpandableText>
            </div>
        </AccessibleAlertBanner>
    )
}
