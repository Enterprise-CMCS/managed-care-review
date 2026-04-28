import React from 'react'
import { GridContainer } from '@trussworks/react-uswds'

import styles from './ContactUs.module.scss'

export const ContactUs = (): React.ReactElement => {
    return (
        <div className={styles.pageWrapper}>
            <GridContainer className={styles.pageContainer}>
                <h1>Contact us</h1>
                <p className={styles.contactIntro}>
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
                <p className={styles.contactLead}>
                    If you don&apos;t find an answer:
                </p>
                <ul className={styles.contactList}>
                    <li>
                        <p className={styles.contactListItem}>
                            For program, contract, and operational questions
                        </p>
                        <p className={styles.contactListItemLast}>
                            Email your primary CMS contact or{' '}
                            <a href="mailto:MCGDMCOactions@cms.hhs.gov">
                                MCGDMCOactions@cms.hhs.gov
                            </a>
                        </p>
                    </li>
                    <li>
                        <p className={styles.contactListItem}>
                            For technical assistance with MC-Review, including
                            logging in
                        </p>
                        <p className={styles.contactListItemLast}>
                            Email{' '}
                            <a href="mailto:MC_Review_HelpDesk@cms.hhs.gov">
                                MC_Review_HelpDesk@cms.hhs.gov
                            </a>
                        </p>
                    </li>
                </ul>
            </GridContainer>
        </div>
    )
}
