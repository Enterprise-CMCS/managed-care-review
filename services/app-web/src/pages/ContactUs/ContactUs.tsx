import React from 'react'
import { GridContainer } from '@trussworks/react-uswds'

import styles from './ContactUs.module.scss'

export const ContactUs = (): React.ReactElement => {
    return (
        <GridContainer className={styles.pageContainer}>
            <h1 className={styles.heading}>Contact us</h1>

            <p className={styles.intro}>
                Have a question? Visit the{' '}
                <a
                    href="https://www.medicaid.gov/resources-for-states/managed-care-review-mc-review/managed-care-review-faqs"
                    target="_blank"
                    rel="noreferrer"
                >
                    FAQ page
                </a>{' '}
                for answers to common questions about MC-Review.
            </p>

            <p className={styles.intro}>If you don&apos;t find an answer:</p>

            <ul className={styles.contactList}>
                <li className={styles.contactItem}>
                    <p className={styles.contactHeading}>
                        For program, contract, and operational questions
                    </p>
                    <p className={styles.contactCopy}>
                        Email your primary CMS contact or{' '}
                        <a href="mailto:MCGDMCOactions@cms.hhs.gov">
                            MCGDMCOactions@cms.hhs.gov
                        </a>
                    </p>
                </li>
                <li className={styles.contactItem}>
                    <p className={styles.contactHeading}>
                        For technical assistance with MC-Review, including
                        logging in
                    </p>
                    <p className={styles.contactCopy}>
                        Email{' '}
                        <a href="mailto:MC_Review_HelpDesk@cms.hhs.gov">
                            MC_Review_HelpDesk@cms.hhs.gov
                        </a>
                    </p>
                </li>
            </ul>
        </GridContainer>
    )
}
