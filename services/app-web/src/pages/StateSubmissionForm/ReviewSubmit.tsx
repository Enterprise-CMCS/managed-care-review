import { GridContainer, Button, Grid, Table, Tag, ButtonGroup, Link } from '@trussworks/react-uswds'
import styles from './StateSubmissionForm.module.scss'

export const ReviewSubmit = ({
    code,
}: {
    code: string
}): React.ReactElement => {
    return (
        <GridContainer className={styles.reviewSectionWrapper}>
            <Grid row>
                <Grid col={12} tablet={{ col: 8, offset: 2 }}>
                    <section id="submissionType" className={styles.reviewSection}>
                        <div className={styles.reviewSectionHeader}>
                            <h3 className={styles.submissionName}>VA-CCCPlus-0001</h3>
                            <div>
                                <Button type="button" outline>
                                    Edit
                                </Button>
                            </div>
                        </div>
                        <Grid row gap className={styles.reviewDataRow}>
                            <Grid tablet={{col: 6}}>
                                <div className={styles.reviewData}>
                                    <label htmlFor="program">Program</label>
                                    <p id="program">CCC Plus</p>
                                </div>
                            </Grid>
                            <Grid tablet={{col: 6}}>
                                <div className={styles.reviewData}>
                                    <label htmlFor="submissionType">Program</label>
                                    <p id="submissionType">Contract action and rate certification</p>
                                </div>
                            </Grid>
                        </Grid>
                        <Grid row gap className={styles.reviewDataRow}>
                            <Grid col={12}>
                                <div className={styles.reviewData}>
                                    <label htmlFor="submissionDesc">Submission description</label>
                                    <p id="submissionDesc">The contract is being amended to reflect revised capitation rates based on more recent data as well as benefit changes approved by the General Assembly.</p>
                                </div>
                            </Grid>
                        </Grid>
                    </section>
                    <section id="contractDetails" className={styles.reviewSection}>
                        <div className={styles.reviewSectionHeader}>
                            <h3>Contract details</h3>
                            <div>
                                <Button type="button" outline>
                                    Edit
                                </Button>
                            </div>
                        </div>
                        <Grid row gap className={styles.reviewDataRow}>
                            <Grid tablet={{col: 6}}>
                                <div className={styles.reviewData}>
                                    <label htmlFor="contractType">Contract action type</label>
                                    <p id="contractType">Amendment to base contract</p>
                                </div>
                            </Grid>
                            <Grid tablet={{col: 6}}>
                                <div className={styles.reviewData}>
                                    <label htmlFor="contractEffectiveDates">Contract effective dates</label>
                                    <p id="contractEffectiveDates">07/01/2020 - 06/30/2021</p>
                                </div>
                            </Grid>
                        </Grid>
                        <Grid row gap className={styles.reviewDataRow}>
                            <Grid tablet={{col: 6}}>
                                <div className={styles.reviewData}>
                                    <label htmlFor="managedCareEntities">Managed care entities</label>
                                    <p id="managedCareEntities">Managed Care Organization (MCO)</p>
                                </div>
                            </Grid>
                            <Grid tablet={{col: 6}}>
                                <div className={styles.reviewData}>
                                    <label htmlFor="itemsAmended">Items being amended</label>
                                    <p id="itemsAmended">Benefits provided, Capitation rates (Updates based on more recent data)</p>
                                </div>
                            </Grid>
                        </Grid>
                        <Grid row gap className={styles.reviewDataRow}>
                            <Grid tablet={{col: 6}}>
                                <div className={styles.reviewData}>
                                    <label htmlFor="federalOperatingAuth">Federal authority your program operates under</label>
                                    <p id="federalOperatingAuth">1115 waiver</p>
                                </div>
                            </Grid>
                            <Grid tablet={{col: 6}}>
                                <div className={styles.reviewData}>
                                    <label htmlFor="covidRelated">Is this contract action related to the COVID-19 public health emergency</label>
                                    <p id="covidRelated">Yes</p>
                                </div>
                            </Grid>
                        </Grid>
                        <Grid row gap className={styles.reviewDataRow}>
                            <Grid tablet={{col: 6}}>
                                <div className={styles.reviewData}>
                                    <label htmlFor="vaccineRelated">Is this related to coverage and reimbursement for vaccine administration?</label>
                                    <p id="vaccineRelated">Yes</p>
                                </div>
                            </Grid>
                        </Grid>
                    </section>
                    <section id="rateDetails" className={styles.reviewSection}>
                        <div className={styles.reviewSectionHeader}>
                            <h3>Rate details</h3>
                            <div>
                                <Button type="button" outline>
                                    Edit
                                </Button>
                            </div>
                        </div>
                        <Grid row gap className={styles.reviewDataRow}>
                            <Grid tablet={{col: 6}}>
                                <div className={styles.reviewData}>
                                    <label htmlFor="rateType">Rate certification type</label>
                                    <p id="rateType">New rate certification</p>
                                </div>
                            </Grid>
                            <Grid tablet={{col: 6}}>
                                <div className={styles.reviewData}>
                                    <label htmlFor="ratingPeriod">Rating period</label>
                                    <p id="ratingPeriod">07/01/2020 - 06/30/2021</p>
                                </div>
                            </Grid>
                        </Grid>
                        <Grid row gap className={styles.reviewDataRow}>
                            <Grid tablet={{col: 6}}>
                                <div className={styles.reviewData}>
                                    <label htmlFor="dateCertified">Date certified</label>
                                    <p id="dateCertified">06/03/2021</p>
                                </div>
                            </Grid>
                        </Grid>
                    </section>
                    <section id="contacts" className={styles.reviewSection}>
                        <div className={styles.reviewSectionHeader}>
                            <h3>State contacts</h3>
                            <div>
                                <Button type="button" outline>
                                    Edit
                                </Button>
                            </div>
                        </div>
                        <Grid row gap className={styles.reviewDataRow}>
                            <Grid tablet={{col: 6}}>
                                <div className={styles.reviewData}>
                                    <label htmlFor="stateContact1">Contact 1</label>
                                    <div id="stateContact1" className={styles.contactInfo}>
                                        <p>Dorothea Wigmund</p>
                                        <p>Integrated Care Policy Specialist</p>
                                        <p>dorothea@virginia.gov</p>
                                        <p>555-555-5555</p>
                                    </div>
                                </div>
                            </Grid>
                            <Grid tablet={{col: 6}}>
                                <div className={styles.reviewData}>
                                    <label htmlFor="stateContact2">Contact 1</label>
                                    <div id="stateContact2" className={styles.contactInfo}>
                                        <p>Dominic Sunita</p>
                                        <p>Integrated Care Policy Specialist</p>
                                        <p>dominic@virginia.gov</p>
                                        <p>555-555-5555</p>
                                    </div>
                                </div>
                            </Grid>
                        </Grid>
                        <div className={styles.reviewSectionHeader}>
                            <h3>Actuary contacts</h3>
                            <div>
                                <Button type="button" outline>
                                    Edit
                                </Button>
                            </div>
                        </div>
                        <Grid row gap className={styles.reviewDataRow}>
                            <Grid tablet={{col: 6}}>
                                <div className={styles.reviewData}>
                                    <label htmlFor="certifyingActuary">Certifying actuary</label>
                                    <div id="certifyingActuary" className={styles.contactInfo}>
                                        <p>Roswell Ness</p>
                                        <p>Partner</p>
                                        <p>roswell@milliman.com</p>
                                        <p>555-555-5555</p>
                                    </div>
                                </div>
                            </Grid>
                            <Grid tablet={{col: 6}}>
                                <div className={styles.reviewData}>
                                    <label htmlFor="additionalActuaryContact">Additional actuary contact</label>
                                    <div id="additionalActuaryContact" className={styles.contactInfo}>
                                        <p>Brendon Britton</p>
                                        <p>Partner</p>
                                        <p>brendon@milliman.com</p>
                                        <p>555-555-5555</p>
                                    </div>
                                </div>
                            </Grid>
                        </Grid>
                        <Grid row gap className={styles.reviewDataRow}>
                            <Grid col={12}>
                                <div className={styles.reviewData}>
                                    <label htmlFor="actuaryCommsPreference">
                                    Actuary communication preference
                                    </label>
                                    <p id="actuaryCommsPreference">The CMS Office of the Actuary can communicate directly with the state, and the state will relay all written communication to their actuary and set up time for any potential verbal discussions.</p>
                                </div>
                            </Grid>
                        </Grid>
                    </section>
                    <section id="documents" className={styles.reviewSection}>
                        <div className={styles.reviewSectionHeader}>
                            <h3>Documents</h3>
                            <div>
                                <Button type="button" outline>
                                    Edit
                                </Button>
                            </div>
                        </div>
                        <Table bordered={false} fullWidth={true} fixed={true}>
                            <caption className="srOnly">Documents included with this submission</caption>
                            <thead>
                                <tr>
                                    <th scope="col">Document</th>
                                    <th scope="col">Description</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>
                                        <a href="/">FINAL CCC Plus Contract Effective July 2020.pdf</a>
                                    </td>
                                    <td>
                                        <p className={styles.documentDesc}>Executed contract action effective July 2020</p>
                                        <Tag>Executed contract</Tag>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <a href="/">Aetna Signature Page CCC Plus Jul 2020 Contract_Executed_signed.pdf</a>
                                    </td>
                                    <td>
                                        <p className={styles.documentDesc}>Signature page</p>
                                        <Tag>Executed contract</Tag>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <a href="/">Anthem CCC Plus July 1 2020 Sig page_signed.pdf</a>
                                    </td>
                                    <td>
                                        <p className={styles.documentDesc}>Signature page</p>
                                        <Tag>Executed contract</Tag>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <a href="/">Magellan Complete Care Signature Page CCC Plus Jul 2020 Contract_signed.pdf</a>
                                    </td>
                                    <td>
                                        <p className={styles.documentDesc}>Signature page</p>
                                        <Tag>Executed contract</Tag>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <a href="/">Optima Executed Signature Page CCC Plus July 1 2020_signed.pdf</a>
                                    </td>
                                    <td>
                                        <p className={styles.documentDesc}>Signature page</p>
                                        <Tag>Executed contract</Tag>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <a href="/">United Signature Page CCC Plus Jul 2020 Contract_signed.pdf</a>
                                    </td>
                                    <td>
                                        <p className={styles.documentDesc}>Signature page</p>
                                        <Tag>Executed contract</Tag>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <a href="/">CCC+ Contract_VAP_Executed_signed.pdf</a>
                                    </td>
                                    <td>
                                        <p className={styles.documentDesc}>Signature page</p>
                                        <Tag>Executed contract</Tag>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <a href="/">July 2020 Contract Change Document.pdf</a>
                                    </td>
                                    <td>
                                        <p className={styles.documentDesc}>Contract change document</p>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <a href="/">FY2021 CCC Plus Rate_2020 06 03 Final.pdf</a>
                                    </td>
                                    <td>
                                        <p className={styles.documentDesc}>CCC Plus rate certification</p>
                                        <Tag>Signed rate certification</Tag>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <a href="/">FY2021 CCC Plus Rate Development Guide_2020 06 03.pdf</a>
                                    </td>
                                    <td>
                                        <p className={styles.documentDesc}>Rate development guide</p>
                                    </td>
                                </tr>
                            </tbody>
                        </Table>
                    </section>
                    <div className={styles.pageActions}>
                        <Link href="#">Save as draft</Link>
                        <ButtonGroup type="default" className={styles.buttonGroup}>
                            <Link href="#" className="usa-button usa-button--outline">Back</Link>
                            <Button type="button" className={styles.submitButton}>Submit</Button>
                        </ButtonGroup>
                    </div>
                </Grid>
            </Grid>
        </GridContainer>
    )
}
