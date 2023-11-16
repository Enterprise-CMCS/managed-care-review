import React, { useEffect } from 'react'
import { useLocation } from 'react-router'
import { GridContainer, Table } from '@trussworks/react-uswds'
import styles from './Help.module.scss'
import { useAuth } from '../../contexts/AuthContext'

export const Help = (): React.ReactElement => {
    const location = useLocation()
    const { loggedInUser } = useAuth()

    useEffect(() => {
        if (location.hash) {
            const id = location.hash.replace('#', '')
            const element = document.getElementById(id)
            if (element) element.scrollIntoView({ behavior: 'smooth' })
        }
    }, [location])

    return (
        <GridContainer
            data-testid={
                loggedInUser ? 'help-authenticated' : 'help-unauthenticated'
            }
        >
            <h2>Help documentation</h2>
            <section className={styles.helpSection}>
                <h3 id="submission-description">
                    Submission description examples
                </h3>
                <h4>Example #1</h4>
                <p className="line-height-sans-4 measure-6">
                    This amendment revises calendar year (CY) 2019 capitation
                    rates, adds new language concerning capitation payments
                    related to a program no longer authorized by law, and
                    changes the requirement that the MCO pay or deny clean paper
                    claims within thirty (30), rather than twenty-one (21)
                    calendar days of receipt.
                </p>
                <h4>Example #2</h4>
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
                <h3 id="effective-date-guidance">Effective date guidance</h3>
                <h4>Contract effective dates</h4>
                <p className="line-height-sans-4 measure-6">
                    These dates should reflect the full length of your initial
                    base contract, which may span multiple years.
                </p>
                <h4>Amendment effective dates</h4>
                <p className="line-height-sans-4 measure-6">
                    These dates should reflect the length of your contract
                    amendment, which could be for a subset of your base
                    contract, for the entire remaining length of the base
                    contract, or an extension beyond the original end date of
                    your base contract.
                </p>
            </section>
            <section className={styles.helpSection}>
                <h3 id="non-compliance-guidance">Non-compliance guidance</h3>
                <h4>Contractual versus operational compliance</h4>
                <p className="line-height-sans-4 measure-6">
                    A contract action is contractually compliant if the
                    requirements are explicitly stated in the contract.
                </p>
                <p className="line-height-sans-4 measure-6">
                    A contract action is operationally compliant if the
                    associated health plans adhere to the requirement, but the
                    requirement is not stated explicitly in the contract.
                    Operational compliance does not achieve contractual
                    compliance.
                </p>
                <p className="line-height-sans-4 measure-6">
                    If the contract action is only operationally compliant, you
                    must select, “No, the contract does not fully comply with
                    all applicable requirements.” and complete the question that
                    follows.
                </p>
                <h4>Example #1</h4>
                <p className="line-height-sans-4 measure-6">
                    This contract action is not compliant with § 438.71(a), due
                    to the need for legislative approval. We plan to incorporate
                    this new requirement into our contracts effective July 1,
                    2024, and submit the amendment to CMS no later than August
                    1, 2024. We have communicated this new requirement to health
                    plans, informing them that the system must be implemented no
                    later than July 1, 2024.
                </p>
                <h4>Example #2</h4>
                <p className="line-height-sans-4 measure-6">
                    This contract action does not include the requirement at
                    §438.10(c)(6)(ii). The state overlooked this requirement
                    when developing SFY24 contracts. However, we conduct ongoing
                    monitoring of plans’ compliance with all information
                    requirements, and attest to the plans’ operational
                    compliance with §438.10(c)(6)(ii). We will be updating our
                    contracts with this provision, effective July 1, 2024, and
                    will submit the amendment to CMS no later than August 1,
                    2024.
                </p>
            </section>
            <section className={styles.helpSection}>
                <h3 id="rate-cert-type-definitions">
                    Rate certification type definitions
                </h3>
                <h4>New rate certification</h4>
                <p className="line-height-sans-4 measure-6">
                    This should be selected for all rate certifications for
                    initial base contracts and rate certifications for required
                    annual rate updates. If you do not have existing rates for
                    the 12-month rating period on your certification, it is
                    considered new.
                </p>
                <h4>Amendment to prior rate certification</h4>
                <p className="line-height-sans-4 measure-6">
                    This should be selected for any rate certifications that are
                    making changes to capitation rates in your current 12-month
                    rating period.
                </p>
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
                            <td>
                                The final language agreed to by all parties.
                            </td>
                            <td>
                                For all "base contract" "contract action"
                                submissions.
                            </td>
                            <td>
                                Medicaid: § 438.3(a)
                                <br />
                                <br />
                                CHIP: § 457.1201
                            </td>
                            <td>Contract</td>
                        </tr>
                        <tr>
                            <td>Contract amendment</td>
                            <td>
                                The final language agreed to by all parties for
                                a change to the base contract
                            </td>
                            <td>
                                For all "amendment to base contract"
                                submissions.
                            </td>
                            <td>
                                Medicaid: § 438.3(a)
                                <br />
                                <br />
                                CHIP: § 457.1201
                            </td>
                            <td>Contract</td>
                        </tr>
                        <tr>
                            <td>Contract appendix</td>
                            <td>
                                All appendices and attachments to the contract
                                document. <br />
                                <br />
                                Please note: Adding a new appendix during the
                                course of a contract period requires an executed
                                "amendment to base contract" submission.
                            </td>
                            <td>
                                For all "base contract" and "amendment to base
                                contract" submissions.
                            </td>
                            <td>
                                <a
                                    href="https://www.medicaid.gov/federal-policy-guidance/downloads/cib110819.pdf"
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    11.8.2019 CMCS Informational Bulletin
                                </a>
                            </td>
                            <td>Contract</td>
                        </tr>
                        <tr>
                            <td>Signature pages</td>
                            <td>
                                Contract pages that are signed and dated by all
                                parties. <br />
                                <br />
                                These can be part of the base contract/contract
                                amendment document, or can be attached
                                separately.
                            </td>
                            <td>For all submissions</td>
                            <td>
                                Medicaid: § 438.3(a) <br />
                                <br />
                                CHIP:§ 457.1201
                            </td>
                            <td>Contract</td>
                        </tr>
                        <tr>
                            <td>Rate certification</td>
                            <td>
                                The actuary’s certification of the rates or rate
                                ranges, along with the report from the actuary
                                describing the development of the rates or rate
                                ranges.
                            </td>
                            <td>
                                For all "contract action and rate certification"
                                submissions.
                            </td>
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
                            <td>
                                Redlined contract changes/Contract change
                                document
                            </td>
                            <td>
                                States who have significant changes between one
                                contract verison and the next will sometimes
                                submit redlined or contract change documents to
                                CMS in order to clearly outline the changes
                                between each version.
                            </td>
                            <td>Optional</td>
                            <td>
                                <a
                                    href="https://www.medicaid.gov/federal-policy-guidance/downloads/cib110819.pdf"
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    11.8.2019 CMCS Informational Bulletin
                                </a>
                            </td>
                            <td>Contract - supporting</td>
                        </tr>
                        <tr>
                            <td>Readiness review results</td>
                            <td>
                                The state's assessment of the ability and
                                capacity of the managed care plan to
                                satisfactorily perform
                                operations/administration, service delivery, and
                                financial management functions per 42 CFR
                                438.66(d)(4)(i) - (iii)
                            </td>
                            <td>
                                For all "contract action" submissions where a
                                state implements in Medicaid 1) a new managed
                                care program, 2) a new managed care plan not
                                previously contracted with the state, or 3) the
                                provision of covered benefits to new eligibility
                                groups.
                            </td>
                            <td>Medicaid: § 438.66(d)(2)(iii)</td>
                            <td>Contract - supporting</td>
                        </tr>
                        <tr>
                            <td>MH/SUD Parity Analysis</td>
                            <td>
                                Mental Health Parity and Addiction Equity Act of
                                2008 (MHPAEA) is a federal law that generally
                                prevents group health plans and health insurance
                                issuers that provide mental health or substance
                                use disorder (MH/SUD) benefits from imposing
                                less favorable benefit limitations on those
                                benefits than on medical/surgical benefits. This
                                analysis supports the parity of those benefits.
                            </td>
                            <td>
                                For all "contract action" submissions where a
                                state provides any services to MCO enrollees
                                using a delivery system other than the MCO and
                                1) a change in benefits provided by the MCO,
                                PIHP, PAHP or FFS is occurring or 2) the State
                                is contracting with a new MCO(s).
                            </td>
                            <td>
                                Medicaid: § 438.3(n)(2), § 438.920 <br />
                                <br />
                                CHIP: § 457.496(f), § 457.1201(l){' '}
                            </td>
                            <td>Contract - supporting</td>
                        </tr>
                        <tr>
                            <td>Rate development index</td>
                            <td>
                                The rate certification must include an index
                                that identifies the page number or the section
                                number for each item described within this
                                guidance. In cases where not all sections of
                                this guidance are relevant for a particular rate
                                certification (i.e., a rate amendment that adds
                                a new benefit for part of the year),
                                inapplicable sections of the guidance must be
                                included and marked as “Not Applicable” in the
                                index.
                            </td>
                            <td>
                                For all "contract action and rate certification"
                                submissions. All rate certifications must be
                                accompanied by an index and this index should
                                also follow the structure of the most recent{' '}
                                <a
                                    href="https://www.medicaid.gov/medicaid/managed-care/downloads/2021-2022-medicaid-rate-guide-11102021.pdf"
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    Rate Development Guide
                                </a>{' '}
                                from CMS.
                            </td>
                            <td>
                                § 438.7(a), § 438.7(d) <br />
                                <br />
                                <a
                                    href="https://www.medicaid.gov/medicaid/managed-care/downloads/2021-2022-medicaid-rate-guide-11102021.pdf"
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    Section 1. Item 1.B.v. of the Medicaid
                                    Managed Care Rate Development Guide
                                </a>
                            </td>
                            <td>Rate - supporting</td>
                        </tr>
                        <tr>
                            <td>
                                Accelerated rate review -- rate development
                                summary
                            </td>
                            <td>
                                In order to receive an accelerated rate review,
                                states must submit a Rate Development Summary
                                that includes all elements listed in the most
                                recent{' '}
                                <a
                                    href="https://www.medicaid.gov/medicaid/managed-care/downloads/2021-2022-medicaid-rate-guide-11102021.pdf"
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    Rate Development Guide
                                </a>{' '}
                                from CMS.
                            </td>
                            <td>
                                For all "contract action and rate certification"
                                submissions where states elect to use the
                                accelerated rate review process.
                            </td>
                            <td>
                                § 438.7(d)
                                <br />
                                <br />
                                <a
                                    href="https://www.medicaid.gov/medicaid/managed-care/downloads/2021-2022-medicaid-rate-guide-11102021.pdf"
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    Appendix A of the Medicaid Managed Care Rate
                                    Development Guide
                                </a>
                            </td>
                            <td>Rate - supporting</td>
                        </tr>
                        <tr>
                            <td>Rate appendix/exhibit</td>
                            <td>
                                Supplementary material related to a rate
                                certification.
                                <br />
                                <br />
                                Appendices can be included within the rate
                                certification itself or submitted as separate
                                documents.
                            </td>
                            <td>
                                For all "contract action and rate certification"
                                submissions. All documents attached to a rate
                                certification must be submitted.{' '}
                            </td>
                            <td>§ 438.7(a)</td>
                            <td>Rate - supporting</td>
                        </tr>
                        <tr>
                            <td>MLR report</td>
                            <td>
                                The Affordable Care Act requires health
                                insurance issuers to submit data on the
                                proportion of premium revenues spent on clinical
                                services and quality improvement, also known as
                                the Medical Loss Ratio (MLR).
                            </td>
                            <td>
                                For all "contract action and rate certification"
                                submissions where states implement capitation
                                rates for the state’s annual rating period.
                            </td>
                            <td>
                                Medicaid: § 438.74(a) <br />
                                <br />
                                CHIP: § 457.1203(e){' '}
                            </td>
                            <td>Rate - supporting</td>
                        </tr>
                        <tr>
                            <td>Other contract documentation</td>
                            <td>
                                A document that relates to the contract action,
                                but is not described by the other available
                                document types.
                            </td>
                            <td>Optional</td>
                            <td>
                                Medicaid: § 438.3(a) <br />
                                <br />
                                CHIP: § 457.1201
                            </td>
                            <td>Contract - supporting</td>
                        </tr>
                        <tr>
                            <td>Other Rate Documentation</td>
                            <td>
                                A document that relates to the rate
                                certification, but is not described by the other
                                available document types.
                            </td>
                            <td>Optional</td>
                            <td>§ 438.7(a)</td>
                            <td>Rate -supporting</td>
                        </tr>
                        <tr>
                            <td>Actuarial justification</td>
                            <td>
                                Document that explains how rates continue to be
                                actuarially sound, despite contract
                                modifications.
                            </td>
                            <td>
                                For all “contract action only” submissions which
                                include modifications that could reasonably
                                impact rates.
                            </td>
                            <td>§ 438.4</td>
                            <td>Contract - supporting</td>
                        </tr>
                        <tr>
                            <td>Per cell rate change documentation</td>
                            <td>
                                Documentation of the percentage change of the
                                rate adjustment per rate cell in comparison to
                                the most recently certified actuarially sound
                                capitation rates.
                            </td>
                            <td>
                                For all “contract action only” submissions that
                                increase or decrease the capitation rates per
                                cell up to 1.5% during the rating period.
                            </td>
                            <td>§ 438.7(c)(3)</td>
                            <td>Contract - supporting</td>
                        </tr>
                        <tr>
                            <td>Per cell rate range change documentation</td>
                            <td>
                                Documentation of the percentage change of the
                                rate adjustment per rate cell in comparison to
                                the most recently contracted rates consistent
                                with the certified actuarially sound rate
                                ranges.
                            </td>
                            <td>
                                For all “contract action only” submissions that
                                increase or decrease the capitation rates per
                                cell within the certified rate range up to 1%
                                during the rating period.
                            </td>
                            <td>§ 438.4(c)(2)</td>
                            <td>Contract - supporting</td>
                        </tr>
                    </tbody>
                </Table>
            </section>
        </GridContainer>
    )
}
