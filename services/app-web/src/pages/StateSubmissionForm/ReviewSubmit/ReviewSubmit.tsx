import { GridContainer, Grid, Table, Tag, Link } from '@trussworks/react-uswds'
import { PageActions } from '../PageActions'
import styles from './ReviewSubmit.module.scss'

export const ReviewSubmit = (): React.ReactElement => {
    return (
        <GridContainer className={styles.reviewSectionWrapper}>
            <Grid row>
                <Grid col={12} tablet={{ col: 8, offset: 2 }}>
                    <section
                        id="submissionType"
                        className={styles.reviewSection}
                    >
                        <div className={styles.reviewSectionHeader}>
                            <h2 className={styles.submissionName}>
                                VA-CCCPlus-0001
                            </h2>
                            <div>
                                <Link
                                    variant="unstyled"
                                    href="#"
                                    className="usa-button usa-button--outline"
                                >
                                    Edit
                                    <span className="srOnly">
                                        Submission type
                                    </span>
                                </Link>
                            </div>
                        </div>
                        <DoubleColumnRow
                            left={
                                <DataDetail
                                    id="program"
                                    label="Program"
                                    data="CCC Plus"
                                />
                            }
                            right={
                                <DataDetail
                                    id="submissionType"
                                    label="Submission type"
                                    data="Contract action and rate certification"
                                />
                            }
                        />
                        <Grid row gap className={styles.reviewDataRow}>
                            <Grid col={12}>
                                <DataDetail
                                    id="submissionDesc"
                                    label="Submission description"
                                    data="The contract is being amended to reflect revised capitation rates based on more recent data as well as benefit changes approved by the General Assembly."
                                />
                            </Grid>
                        </Grid>
                    </section>
                    <section
                        id="contractDetails"
                        className={styles.reviewSection}
                    >
                        <SectionHeader header="Contract details" href="#" />
                        <DoubleColumnRow
                            left={
                                <DataDetail
                                    id="contractType"
                                    label="Contract action type"
                                    data="Amendment to base contract"
                                />
                            }
                            right={
                                <DataDetail
                                    id="contractEffectiveDates"
                                    label="Contract effective dates"
                                    data="07/01/2020 - 06/30/2021"
                                />
                            }
                        />
                        <DoubleColumnRow
                            left={
                                <DataDetail
                                    id="managedCareEntities"
                                    label="Managed care entities"
                                    data="Managed Care Organization (MCO)"
                                />
                            }
                            right={
                                <DataDetail
                                    id="itemsAmended"
                                    label="Items being amended"
                                    data="Benefits provided, Capitation rates (Updates based on more recent data)"
                                />
                            }
                        />
                        <DoubleColumnRow
                            left={
                                <DataDetail
                                    id="federalOperatingAuth"
                                    label="Federal authority your program operates under"
                                    data="1115 waiver"
                                />
                            }
                            right={
                                <DataDetail
                                    id="covidRelated"
                                    label="Is this contract action related to the COVID-19 public health emergency"
                                    data="Yes"
                                />
                            }
                        />
                        <DoubleColumnRow
                            left={
                                <DataDetail
                                    id="vaccineRelated"
                                    label="Is this related to coverage and reimbursement for vaccine administration?"
                                    data="Yes"
                                />
                            }
                        />
                    </section>
                    <section id="rateDetails" className={styles.reviewSection}>
                        <SectionHeader header="Rate details" href="#" />
                        <DoubleColumnRow
                            left={
                                <DataDetail
                                    id="rateType"
                                    label="Rate certification type"
                                    data="New rate certification"
                                />
                            }
                            right={
                                <DataDetail
                                    id="ratingPeriod"
                                    label="Rating period"
                                    data="07/01/2020 - 06/30/2021"
                                />
                            }
                        />
                        <DoubleColumnRow
                            left={
                                <DataDetail
                                    id="dateCertified"
                                    label="Date certified"
                                    data="06/03/2021"
                                />
                            }
                        />
                    </section>
                    <section id="contacts" className={styles.reviewSection}>
                        <SectionHeader header="State contacts" href="#" />
                        <DoubleColumnRow
                            left={
                                <DataDetail
                                    id="stateContact1"
                                    label="Contact 1"
                                    address={
                                        <address className="address">
                                            Dorothea Wigmund <br></br>
                                            Integrated Care Policy Specialist
                                            <br></br>
                                            <a href="mailto:dorothea@virginia.gov">
                                                dorothea@virginia.gov
                                            </a>
                                            <br></br>
                                            <a href="tel:555-555-5555">
                                                555-555-5555
                                            </a>
                                        </address>
                                    }
                                />
                            }
                            right={
                                <DataDetail
                                    id="stateContact2"
                                    label="Contact 2"
                                    address={
                                        <address className="address">
                                            Dominic Sunita<br></br>
                                            Integrated Care Policy Specialist
                                            <br></br>
                                            <a href="mailto:dominic@virginia.gov">
                                                dominic@virginia.gov
                                            </a>
                                            <br></br>
                                            <a href="tel:555-555-5555">
                                                555-555-5555
                                            </a>
                                        </address>
                                    }
                                />
                            }
                        />
                        <SectionHeader header="Actuary contacts" href="#" />
                        <DoubleColumnRow
                            left={
                                <DataDetail
                                    id="certifyingActuary"
                                    label="Certifying actuary"
                                    address={
                                        <address className="address">
                                            Roswell Ness<br></br>
                                            Partner<br></br>
                                            Milliman<br></br>
                                            <a href="mailto:roswell@milliman.com">
                                                roswell@milliman.com
                                            </a>
                                            <br></br>
                                            <a href="tel:555-555-5555">
                                                555-555-5555
                                            </a>
                                        </address>
                                    }
                                />
                            }
                            right={
                                <DataDetail
                                    id="additionalActuaryContact"
                                    label="Additional actuary contact"
                                    address={
                                        <address className="address">
                                            Brendon Britton<br></br>
                                            Partner<br></br>
                                            Milliman<br></br>
                                            <a href="mailto:brendon@milliman.com">
                                                brendon@milliman.com
                                            </a>
                                            <br></br>
                                            <a href="tel:555-555-5555">
                                                555-555-5555
                                            </a>
                                        </address>
                                    }
                                />
                            }
                        />
                        <Grid row gap className={styles.reviewDataRow}>
                            <Grid col={12}>
                                <DataDetail
                                    id="actuaryCommsPreference"
                                    label="Actuary communication preference"
                                    data="The CMS Office of the Actuary can communicate directly with the state, and the state will relay all written communication to their actuary and set up time for any potential verbal discussions."
                                />
                            </Grid>
                        </Grid>
                    </section>
                    <section id="documents" className={styles.reviewSection}>
                        <SectionHeader header="Documents" href="#" />
                        <Table bordered={false} fullWidth={true} fixed={true}>
                            <caption className="srOnly">
                                Documents included with this submission
                            </caption>
                            <thead>
                                <tr>
                                    <th scope="col">Document</th>
                                    <th scope="col">Description</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>
                                        <a href="/">
                                            FINAL CCC Plus Contract Effective
                                            July 2020.pdf
                                        </a>
                                    </td>
                                    <td>
                                        <p className={styles.documentDesc}>
                                            Executed contract action effective
                                            July 2020
                                        </p>
                                        <Tag>Executed contract</Tag>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <a href="/">
                                            Aetna Signature Page CCC Plus Jul
                                            2020 Contract_Executed_signed.pdf
                                        </a>
                                    </td>
                                    <td>
                                        <p className={styles.documentDesc}>
                                            Signature page
                                        </p>
                                        <Tag>Executed contract</Tag>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <a href="/">
                                            Anthem CCC Plus July 1 2020 Sig
                                            page_signed.pdf
                                        </a>
                                    </td>
                                    <td>
                                        <p className={styles.documentDesc}>
                                            Signature page
                                        </p>
                                        <Tag>Executed contract</Tag>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <a href="/">
                                            Magellan Complete Care Signature
                                            Page CCC Plus Jul 2020
                                            Contract_signed.pdf
                                        </a>
                                    </td>
                                    <td>
                                        <p className={styles.documentDesc}>
                                            Signature page
                                        </p>
                                        <Tag>Executed contract</Tag>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <a href="/">
                                            Optima Executed Signature Page CCC
                                            Plus July 1 2020_signed.pdf
                                        </a>
                                    </td>
                                    <td>
                                        <p className={styles.documentDesc}>
                                            Signature page
                                        </p>
                                        <Tag>Executed contract</Tag>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <a href="/">
                                            United Signature Page CCC Plus Jul
                                            2020 Contract_signed.pdf
                                        </a>
                                    </td>
                                    <td>
                                        <p className={styles.documentDesc}>
                                            Signature page
                                        </p>
                                        <Tag>Executed contract</Tag>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <a href="/">
                                            CCC+
                                            Contract_VAP_Executed_signed.pdf
                                        </a>
                                    </td>
                                    <td>
                                        <p className={styles.documentDesc}>
                                            Signature page
                                        </p>
                                        <Tag>Executed contract</Tag>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <a href="/">
                                            July 2020 Contract Change
                                            Document.pdf
                                        </a>
                                    </td>
                                    <td>
                                        <p className={styles.documentDesc}>
                                            Contract change document
                                        </p>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <a href="/">
                                            FY2021 CCC Plus Rate_2020 06 03
                                            Final.pdf
                                        </a>
                                    </td>
                                    <td>
                                        <p className={styles.documentDesc}>
                                            CCC Plus rate certification
                                        </p>
                                        <Tag>Signed rate certification</Tag>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <a href="/">
                                            FY2021 CCC Plus Rate Development
                                            Guide_2020 06 03.pdf
                                        </a>
                                    </td>
                                    <td>
                                        <p className={styles.documentDesc}>
                                            Rate development guide
                                        </p>
                                    </td>
                                </tr>
                            </tbody>
                        </Table>
                    </section>
                    <PageActions
                        secondaryAction="Back"
                        primaryAction="Submit"
                    />
                </Grid>
            </Grid>
        </GridContainer>
    )
}

/*
  Subcomponents
  - these could be candidates for Storybook with further refactoring to handle any className
*/
export type DataDetailProps = {
    id: string
    label: string
    data?: string
    address?: React.ReactNode
}

export const DataDetail = ({
    id,
    label,
    data,
    address,
}: DataDetailProps): React.ReactElement => {
    return (
        <div className={styles.reviewData}>
            <label htmlFor={id}>{label}</label>
            <p id={id}>
                {data}
                {address}
            </p>
        </div>
    )
}

export type DoubleColumnRowProps = {
    left?: React.ReactNode
    right?: React.ReactNode
}

export const DoubleColumnRow = ({
    left,
    right,
}: DoubleColumnRowProps): React.ReactElement => {
    return (
        <Grid row gap className={styles.reviewDataRow}>
            <Grid tablet={{ col: 6 }}>{left}</Grid>
            <Grid tablet={{ col: 6 }}>{right}</Grid>
        </Grid>
    )
}

export type SectionHeaderProps = {
    header: string
    submissionName?: boolean
    href: string
}

export const SectionHeader = ({
    header,
    submissionName,
    href,
}: SectionHeaderProps): React.ReactElement => {
    return (
        <div className={styles.reviewSectionHeader}>
            <h2 className={submissionName ? styles.submissionName : ''}>
                {header}
            </h2>
            <div>
                <Link
                    variant="unstyled"
                    href={href}
                    className="usa-button usa-button--outline"
                >
                    Edit <span className="srOnly">{header}</span>
                </Link>
            </div>
        </div>
    )
}
