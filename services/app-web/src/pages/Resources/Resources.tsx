import React from 'react'
import { GridContainer } from '@trussworks/react-uswds'
import styles from './Resources.module.scss'

export const Resources = (): React.ReactElement => {
    return (
        <GridContainer className={styles.pageContainer}>
            <h2>Resources and training</h2>

            <section className={styles.resourceSection}>
                <h3>User manuals</h3>
                <ul className={styles.resourceList}>
                    <li>
                        <a
                            href="https://www.medicaid.gov/medicaid/managed-care/idm-instns-mc-rvw-state-user-manul.pdf"
                            target="_blank"
                            rel="noreferrer"
                        >
                            State user manual
                        </a>
                    </li>
                    <li>
                        <a
                            href="https://www.medicaid.gov/medicaid/managed-care/idm-instns-mc-rvw-state-user.pdf"
                            target="_blank"
                            rel="noreferrer"
                        >
                            Account creation user manual
                        </a>
                    </li>
                </ul>
            </section>

            <section className={styles.resourceSection}>
                <h3>Policy guidance</h3>
                <ul className={styles.resourceList}>
                    <li>
                        <a
                            href="https://www.medicaid.gov/medicaid/downloads/mce-checklist-state-user-guide.pdf"
                            target="_blank"
                            rel="noreferrer"
                        >
                            State Guide to CMS Criteria for Medicaid Managed
                            Care Contract Review and Approval
                        </a>
                    </li>
                    <li>
                        <a
                            href="https://www.medicaid.gov/medicaid/managed-care/guidance/rate-review-and-rate-guides"
                            target="_blank"
                            rel="noreferrer"
                        >
                            Medicaid Managed Care Rate Development Guide
                        </a>
                    </li>
                </ul>
            </section>

            <section className={styles.resourceSection}>
                <h3>Webinars</h3>
                <ul className={styles.resourceList}>
                    <li>
                        <a
                            href="https://www.youtube.com/watch?v=1d-f0pnLLLE"
                            target="_blank"
                            rel="noreferrer"
                        >
                            MC-Review training webinar recording
                        </a>
                    </li>
                    <li>
                        <a
                            href="https://www.medicaid.gov/medicaid/managed-care/mc-rvw-state-wbnr-sprng-2024.pdf"
                            target="_blank"
                            rel="noreferrer"
                        >
                            MC-Review training webinar - Slide deck
                        </a>
                    </li>
                </ul>
            </section>
        </GridContainer>
    )
}
