import React from 'react'
import { GridContainer } from '@trussworks/react-uswds'
import styles from './Landing.module.scss'

export const Landing = (): React.ReactElement => {
    return (
        <>
            <section className={styles.outlineSection}>
                <GridContainer>
                    <h2>How it works</h2>
                    <ol className={styles.cardList}>
                        <li>
                            <span>
                                We will describe the login process here, once we
                                know how auth will work
                            </span>
                        </li>
                        <li>
                            <span>
                                Fill out the forms and attach all relevant
                                documents for your submission.
                            </span>
                        </li>
                        <li>
                            <span>
                                After you submit, CMS will confirm receipt and
                                start their review process.
                            </span>
                        </li>
                    </ol>
                </GridContainer>
            </section>
            <section className={styles.detailsSection}>
                <GridContainer>
                    <div className={styles.detailsSectionContent}>
                        <h2>
                            In this system, pilot state users can submit Managed
                            Care contract and rate packages that meet the following
                            criteria:
                        </h2>
                        <ul>
                            <li>
                                Contract and rate certifications are fully executed
                            </li>
                            <li>
                                All documents are sent at the time of submission, in
                                a complete package
                            </li>
                            <li>
                                Populations covered are Medicaid and CHIP or
                                Medicaid only
                            </li>
                        </ul>
                        <h3>
                            This system does not currently support the following
                            submission types:
                        </h3>
                        <ul>
                            <li>State-directed payments</li>
                            <li>Enrollment broker contracts</li>
                        </ul>
                    </div>
                </GridContainer>
            </section>
        </>
    )
}
