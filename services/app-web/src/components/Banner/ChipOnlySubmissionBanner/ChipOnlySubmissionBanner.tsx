import React from 'react'
import styles from './ChipOnlySubmissionBanner.module.scss'
import { AccessibleAlertBanner } from '../AccessibleAlertBanner/AccessibleAlertBanner'
import { ExpandableText } from '../../ExpandableText'

export const ChipOnlySubmissionBanner = ({
    className,
    contractName,
}: {
    className?: string
    contractName: string
}): React.ReactElement => {
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
                        {contractName} is not subject to DMCO review and
                        validation.
                    </p>
                    <strong>What comes next:</strong>
                    <ul className={styles.listItems}>
                        <li>
                            Record keeping: This submission will be filed for
                            record keeping. DMCO will not issue formal
                            communication validating that this CHIP-only
                            contract submission meets federal requirements.
                        </li>
                        <li>
                            Questions: You may receive questions via email from
                            other CMS components.
                        </li>
                    </ul>
                    <strong>
                        As a reminder, all CHIP-only contracts must:
                    </strong>
                    <ul className={styles.listItems}>
                        <li>
                            Be submitted to CMS as required at 42 CFR
                            457.1201(a). This includes base contracts,
                            amendments to base contracts, and extensions.
                        </li>
                        <li>
                            Meet all applicable requirements at 42 CFR Part 457,
                            Subpart L.
                        </li>
                    </ul>
                </ExpandableText>
            </div>
        </AccessibleAlertBanner>
    )
}
