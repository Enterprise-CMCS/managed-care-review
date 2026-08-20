import React, { useEffect } from 'react'
import { GridContainer } from '@trussworks/react-uswds'
import { usePage } from '../../contexts/PageContext'
import styles from './Training.module.scss'

export const Training = (): React.ReactElement => {
    const { updateActiveMainContent } = usePage()
    const activeMainContentId = 'resourcesTrainingMainContent'

    useEffect(() => {
        updateActiveMainContent(activeMainContentId)
    }, [activeMainContentId, updateActiveMainContent])

    return (
        <GridContainer
            id={activeMainContentId}
            className={styles.pageContainer}
        >
            <h1>Resources and training</h1>

            <section className={styles.resourceSection}>
                <h4>User manuals</h4>
                <ul className={styles.resourceList}>
                    <li>
                        <a
                            href="https://www.medicaid.gov/medicaid/managed-care/idm-instns-mc-rvw-state-user-manul.pdf"
                            target="_blank"
                            rel="noreferrer"
                            aria-label="State user manual (opens in new window)"
                        >
                            State user manual
                        </a>
                    </li>
                    <li>
                        <a
                            href="https://www.medicaid.gov/medicaid/managed-care/idm-instns-mc-rvw-state-user.pdf"
                            target="_blank"
                            rel="noreferrer"
                            aria-label="Account creation user manual (opens in new window)"
                        >
                            Account creation user manual
                        </a>
                    </li>
                </ul>
            </section>

            <section className={styles.resourceSection}>
                <h4>Policy guidance</h4>
                <ul className={styles.resourceList}>
                    <li>
                        <a
                            href="https://www.medicaid.gov/medicaid/downloads/mce-checklist-state-user-guide.pdf"
                            target="_blank"
                            rel="noreferrer"
                            aria-label="State Guide to CMS Criteria for Medicaid Managed Care Contract Review and Approval (opens in new window)"
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
                            aria-label="Medicaid Managed Care Rate Development Guide (opens in new window)"
                        >
                            Medicaid Managed Care Rate Development Guide
                        </a>
                    </li>
                </ul>
            </section>

            <section className={styles.resourceSection}>
                <h4>Webinars</h4>
                <ul className={styles.resourceList}>
                    <li>
                        <a
                            href="https://www.youtube.com/watch?v=8uyyaQEAOCI"
                            target="_blank"
                            rel="noreferrer"
                            aria-label="MC-Review overview recording (opens in new window)"
                        >
                            MC-Review overview recording
                        </a>
                    </li>
                    <li>
                        <a
                            href="/MC-Review-overview-Slide-deck.pdf"
                            target="_blank"
                            rel="noreferrer"
                            aria-label="MC-Review overview - Slide deck (opens in new window)"
                        >
                            MC-Review overview - Slide deck
                        </a>
                    </li>
                </ul>
            </section>
        </GridContainer>
    )
}
