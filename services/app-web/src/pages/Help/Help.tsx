import React, { useEffect } from 'react'
import { useLocation } from 'react-router'
import { GridContainer, Table } from '@trussworks/react-uswds'
import styles from './Help.module.scss'

export const Help = (): React.ReactElement => {
    const location = useLocation()

    useEffect(() => {
        if (location.hash) {
            const id = location.hash.replace('#', '')
            const element = document.getElementById(id)
            if (element) element.scrollIntoView({ behavior: 'smooth' })
        }
    }, [location])

    return (
        <GridContainer>
            <h2>Help documentation</h2>
            <section className={styles.helpSection}>
                <h3 id="submission-description">
                    Submission Description Examples
                </h3>
                <h4>Example #1</h4>
                <p className="line-height-sans-4 measure-6">
                    This COVID-related contract amendment adds (1) risk corridor
                    language, (2) a telemedicine in lieu of service benefit, and
                    (3) provisions related to enrollee access and provider
                    relief during public health emergency period. These changes
                    have been authorized through the state’s approved disaster
                    relief State Plan Amendment. There was no rate change
                    associated with this action, but an actuarial certification
                    was submitted due to the implementation of the risk
                    corridor.
                </p>
                <h4>Example #2</h4>
                <p className="line-height-sans-4 measure-6">
                    This amendment revises calendar year (CY) 2019 capitation
                    rates, adds new language concerning capitation payments
                    related to a program no longer authorized by law, and
                    changes the requirement that the MCO pay or deny clean paper
                    claims within thirty (30), rather than twenty-one (21)
                    calendar days of receipt.
                </p>
                <h4>Example #3</h4>
                <p className="line-height-sans-4 measure-6">
                    Amendment 8 adds SUPPORT Act DUR provisions effective
                    10/1/19; reinvestment account language to comply with
                    Nebraska Rev. Stat §71-831; and a high cost drug pool risk
                    corridor. This amendment also modifies the capitation rates;
                    the capitation rate determination process; administrative
                    expense rate calculation time frames; the CY 20 Quality
                    Performance Program measures; and general reporting
                    requirements to remove duplicates.
                </p>
            </section>
            <section className={styles.helpSection}>
                <h3 id="items-being-amended-definitions">
                    Items being amended definitions
                </h3>
                <Table bordered fixed fullWidth>
                    <thead>
                        <tr>
                            <th>Item</th>
                            <th>Definition</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Benefits provided</td>
                            <td>
                                Medical services provided to enrollees by the
                                contractor.
                            </td>
                        </tr>
                        <tr>
                            <td>Capitation rates</td>
                            <td>
                                An amendment to the state’s capitation rates,
                                due to an annual update, a mid-year rate update,
                                or another reason.
                            </td>
                        </tr>
                        <tr>
                            <td>Contract period</td>
                            <td>Extension of the contract period end date.</td>
                        </tr>
                        <tr>
                            <td>Encounter data</td>
                            <td>
                                The collection, maintenance and submission of
                                information relating to services the contractor
                                provides to enrollees.
                            </td>
                        </tr>
                        <tr>
                            <td>Enrollee access</td>
                            <td>
                                Criteria used to determine whether enrollees
                                have adequate access to benefits and network
                                providers.
                            </td>
                        </tr>
                        <tr>
                            <td>Enrollment/disenrollment process</td>
                            <td>
                                The process used to enroll/disenroll
                                beneficiaries to/from the contractor for receipt
                                of medical services.
                            </td>
                        </tr>
                        <tr>
                            <td>Financial incentives</td>
                            <td>
                                A payment arrangement under which the contractor
                                may receive additional funds for meeting targets
                                specified in the contract.
                            </td>
                        </tr>
                        <tr>
                            <td>Geographic area served</td>
                            <td>
                                The geographic region of the state served by the
                                contractor.
                            </td>
                        </tr>
                        <tr>
                            <td>Grievances and appeals system</td>
                            <td>
                                The processes the MCO, PIHP, or PAHP implements
                                to handle appeals of an adverse benefit
                                determination and grievances, as well as the
                                processes to collect and track information about
                                them as described in 42 CFR 438.400.
                            </td>
                        </tr>
                        <tr>
                            <td>Non-risk payment</td>
                            <td>
                                A payment methodology under which the contractor
                                is not at financial risk for changes in
                                utilization or for costs incurred that do not
                                exceed the upper payment limits specified in 42
                                CFR § 447.362.
                            </td>
                        </tr>
                        <tr>
                            <td>Populations enrolled</td>
                            <td>
                                The categories of Medicaid and/or CHIP
                                beneficiaries enrolled with the contractor for
                                receipt of medical services.
                            </td>
                        </tr>
                        <tr>
                            <td>Program integrity</td>
                            <td>
                                Contract provisions related to fraud detection
                                and investigation as addressed in 42 CFR § 438,
                                Subpart H including the imposition of sanctions
                                and the treatment of recoveries as a result of
                                fraud and abuse activities.
                            </td>
                        </tr>
                        <tr>
                            <td>Quality standards</td>
                            <td>
                                Criteria used to determine whether enrollees
                                receive appropriate quality of care.
                            </td>
                        </tr>
                        <tr>
                            <td>Risk sharing mechanisms</td>
                            <td>
                                An arrangement (ex. risk corridor) under which
                                the state and contractor share in profits or
                                losses experienced under the contract as
                                described at 42 CFR § 438.6(b).
                            </td>
                        </tr>
                        <tr>
                            <td>Other (please describe)*</td>
                            <td>
                                Contract provisions related to issues not
                                described in the list above.
                            </td>
                        </tr>
                    </tbody>
                </Table>
            </section>
            <section className={styles.helpSection}>
                <h3 id="document-definitions-requirements">
                    Documents definitions and requirements
                </h3>
                <h4 id="key-documents">Key documents</h4>
                <Table bordered fixed fullWidth>
                    <thead>
                        <tr>
                            <th>Document type</th>
                            <th>Definition</th>
                            <th>Required</th>
                            <th>Regulatory reference</th>
                            <th>MC-Review category</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Base contract</td>
                            <td>The final language agreed to by all parties.</td>
                            <td>For all "base contract" "contract action" submissions.</td>
                            <td>Medicaid: § 438.3(a)<br/><br/>CHIP: § 457.1201</td>
                            <td>Contract</td>
                        </tr>
                        <tr>
                            <td>Contract amendment</td>
                            <td>The final language agreed to by all parties for a change to the base contract</td>
                            <td>For all "amendment to base contract" submissions.</td>
                            <td>Medicaid: § 438.3(a)<br/><br/>CHIP: § 457.1201</td>
                            <td>Contract</td>
                        </tr>
                        <tr>
                            <td>Contract appendix</td>
                            <td>All appendices and attachments to the contract document. <br/><br/>Please note: Adding a new appendix during the course of a contract period requires an executed "amendment to base contract" submission.</td>
                            <td>For all "base contract" and "amendment to base contract" submissions.</td>
                            <td>
                                <a href="https://www.medicaid.gov/federal-policy-guidance/downloads/cib110819.pdf" target="_blank">11.8.2019 CMCS Informational Bulletin</a>
                            </td>
                            <td>Contract</td>
                        </tr>
                        <tr>
                            <td>Rate certification</td>
                            <td>The actuary’s certification of the rates or rate ranges, along with the report from the actuary describing the development of the rates or rate ranges.</td>
                            <td>For all "contract action and rate certification" submissions.</td>
                            <td>Medicaid: § 438.7</td>
                            <td>Rate certification</td>
                        </tr>
                    </tbody>
                </Table>
                <h4 id="supporting-documents">Supporting documents</h4>
                <Table bordered fixed fullWidth>
                    <thead>
                        <tr>
                            <th>Document type</th>
                            <th>Definition</th>
                            <th>Required</th>
                            <th>Regulatory reference</th>
                            <th>MC-Review category</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Signature pages</td>
                            <td>Contract pages that are signed and dated by all parties. <br/><br/>These can be part of the base contract/contract amendment document, or can be attached separately.</td>
                            <td>For all submissions</td>
                            <td>Medicaid: § 438.3(a) <br/><br/>CHIP:§ 457.1201</td>
                            <td>Contract - supporting</td>
                        </tr>
                        <tr>
                            <td>Redlined contract changes/Contract change document</td>
                            <td>States who have significant changes between one contract verison and the next will sometimes submit redlined or contract change documents to CMS in order to clearly outline the changes between each version.</td>
                            <td>Optional</td>
                            <td><a href="https://www.medicaid.gov/federal-policy-guidance/downloads/cib110819.pdf" target="_blank">11.8.2019 CMCS Informational Bulletin</a></td>
                            <td>Contract - supporting</td>
                        </tr>
                        <tr>
                            <td>Readiness review results</td>
                            <td>The state's assessment of the ability and capacity of the managed care plan to satisfactorily perform operations/administration, service delivery, and financial management functions per 42 CFR 438.66(d)(4)(i) - (iii)</td>
                            <td>For all "contract action" submissions where a state implements in Medicaid 1) a new managed care program, 2) a new managed care plan not previously contracted with the state, or 3) the provision of covered benefits to new eligibility groups.</td>
                            <td>Medicaid: § 438.66(d)(2)(iii)</td>
                            <td>Contract - supporting</td>
                        </tr>
                        <tr>
                            <td>MH/SUD Parity Analysis</td>
                            <td>Mental Health Parity and Addiction Equity Act of 2008 (MHPAEA) is a federal law that generally prevents group health plans and health insurance issuers that provide mental health or substance use disorder (MH/SUD) benefits from imposing less favorable benefit limitations on those benefits than on medical/surgical benefits. This analysis supports the parity of those benefits.</td>
                            <td>For all "contract action" submissions where a state provides any services to MCO enrollees using a delivery system other than the MCO and 1) a change in benefits provided by the MCO, PIHP, PAHP or FFS is occurring or 2) the State is contracting with a new MCO(s).</td>
                            <td>Medicaid: § 438.3(n)(2), § 438.920 <br/><br/>CHIP: § 457.496(f), § 457.1201(l) </td>
                            <td>Contract - supporting</td>
                        </tr>
                        <tr>
                            <td>Rate development index</td>
                            <td>The rate certification must include an index that identifies the page number or the section number for each item described within this guidance. In cases where not all sections of this guidance are relevant for a particular rate certification (i.e., a rate amendment that adds a new benefit for part of the year), inapplicable sections of the guidance must be included and marked as “Not Applicable” in the index.</td>
                            <td>For all "contract action and rate certification" submissions. All rate certifications must be accompanied by an index and this index should also follow the structure of the most recent <a href="https://www.medicaid.gov/medicaid/managed-care/downloads/2021-2022-medicaid-rate-guide-11102021.pdf" target="_blank">Rate Development Guide</a> from CMS.</td>
                            <td>§ 438.7(a), § 438.7(d) <br /><br /><a href="https://www.medicaid.gov/medicaid/managed-care/downloads/2021-2022-medicaid-rate-guide-11102021.pdf" target="_blank">Section 1. Item 1.B.v. of the Medicaid Managed Care Rate Development Guide</a></td>
                            <td>Rate - supporting</td>
                        </tr>
                        <tr>
                            <td>Accelerated rate review -- rate development summary</td>
                            <td>In order to receive an accelerated rate review, states must submit a Rate Development Summary that includes all elements listed in the most recent <a href="https://www.medicaid.gov/medicaid/managed-care/downloads/2021-2022-medicaid-rate-guide-11102021.pdf" target="_blank">Rate Development Guide</a> from CMS.</td>
                            <td>For all "contract action and rate certification" submissions where states elect to use the accelerated rate review process.</td>
                            <td>§ 438.7(d)<br /><br /><a href="https://www.medicaid.gov/medicaid/managed-care/downloads/2021-2022-medicaid-rate-guide-11102021.pdf" target="_blank">Appendix A of the Medicaid Managed Care Rate Development Guide</a></td>
                            <td>Rate-supporting</td>
                        </tr>
                        <tr>
                            <td>Rate appendix/exhibit</td>
                            <td>Supplementary material related to a rate certification.<br /><br />Appendices can be included within the rate certification itself or submitted as separate documents.</td>
                            <td>For all "contract action and rate certification" submissions. All documents attached to a rate certification must be submitted. </td>
                            <td>§ 438.7(a)</td>
                            <td>Rate-supporting</td>
                        </tr>
                        <tr>
                            <td>MLR report</td>
                            <td>The Affordable Care Act requires health insurance issuers to submit data on the proportion of premium revenues spent on clinical services and quality improvement, also known as the Medical Loss Ratio (MLR).</td>
                            <td>For all "contract action and rate certification" submissions where states implement capitation rates for the state’s annual rating period.</td>
                            <td>Medicaid: § 438.74(a) <br /><br />CHIP: § 457.1203(e) </td>
                            <td>Rate - supporting</td>
                        </tr>
                        <tr>
                            <td>Other contract documentation</td>
                            <td>A document that relates to the contract action, but is not described by the other available document types.</td>
                            <td>Optional</td>
                            <td>Medicaid: § 438.3(a) <br /><br />CHIP: § 457.1201</td>
                            <td>Contract - supporting</td>
                        </tr>
                        <tr>
                            <td>Other Rate Documentation</td>
                            <td>A document that relates to the rate certification, but is not described by the other available document types.</td>
                            <td>Optional</td>
                            <td>§ 438.7(a)</td>
                            <td>Rate -supporting</td>
                        </tr>
                    </tbody>
                </Table>
            </section>
        </GridContainer>
    )
}
