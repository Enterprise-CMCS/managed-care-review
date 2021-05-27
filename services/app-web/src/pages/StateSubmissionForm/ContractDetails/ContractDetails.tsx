import {
    Form as UswdsForm,
    FormGroup,
    Fieldset,
    Button,
    Link,
    DateRangePicker,
    ButtonGroup,
} from '@trussworks/react-uswds'
import { Link as ReactRouterLink, NavLink, useHistory } from 'react-router-dom'
import PageHeading from '../../../components/PageHeading'
import { FieldRadio } from '../../../components/Form/FieldRadio/FieldRadio'
import { FieldCheckbox } from '../../../components/Form/FieldCheckbox/FieldCheckbox'
import { FieldTextInput } from '../../../components/Form/FieldTextInput/FieldTextInput'
import { DraftSubmission } from '../../../gen/gqlClient'
import { Formik } from 'formik'
import styles from '../StateSubmissionForm.module.scss'

export const ContractDetails = ({
    draftSubmission,
}: {
    draftSubmission: DraftSubmission
}): React.ReactElement => {
    const history = useHistory()

    const handleFormSubmit = () => {
        history.push(`/submissions/${draftSubmission.id}/rate-details`)
    }
    return (
        <>
            <PageHeading className={styles.formHeader} headingLevel="h2">
                Contract details
            </PageHeading>
            <Formik
                initialValues={{ contractType: '' }}
                onSubmit={handleFormSubmit}
            >
                <UswdsForm
                    className={styles.formContainer}
                    id="ContractDetailsForm"
                    aria-label="Contract Details Form"
                    onSubmit={handleFormSubmit}
                >
                    <fieldset className="usa-fieldset">
                        <legend className="srOnly">Contract Details</legend>
                        <span>All fields are required</span>
                        <FormGroup>
                            <Fieldset
                                className={styles.radioGroup}
                                legend="Contract action type"
                            >
                                <FieldRadio
                                    id="baseContract"
                                    name="contractType"
                                    label="Base contract"
                                    value="base-contract"
                                />
                                <FieldRadio
                                    id="amendmentContract"
                                    name="contractType"
                                    label="Amendment to base contract"
                                    value="amendment-contract"
                                />
                            </Fieldset>
                        </FormGroup>
                        <FormGroup>
                            <Fieldset legend="Contract effective dates">
                                <DateRangePicker
                                    className={styles.dateRangePicker}
                                    endDateHint="mm/dd/yyyy"
                                    endDateLabel="Start date"
                                    endDatePickerProps={{
                                        disabled: false,
                                        id: 'contract-date-start',
                                        name: 'contract-date-start',
                                    }}
                                    startDateHint="mm/dd/yyyy"
                                    startDateLabel="End date"
                                    startDatePickerProps={{
                                        disabled: false,
                                        id: 'contract-date-end',
                                        name: 'contract-date-end',
                                    }}
                                />
                            </Fieldset>
                        </FormGroup>
                        <FormGroup>
                            <Fieldset legend="Managed Care entities">
                                <Link
                                    variant="external"
                                    href={
                                        'https://www.medicaid.gov/medicaid/managed-care/managed-care-entities/index.html'
                                    }
                                    target="_blank"
                                >
                                    Managed Care entity definitions
                                </Link>
                                <div className="usa-hint">
                                    <span>Check all that apply</span>
                                </div>
                                <FieldCheckbox
                                    id="managedCareOrganization"
                                    name="managedCareEntity"
                                    label="Managed Care Organization (MCO)"
                                    value="mco"
                                />
                                <FieldCheckbox
                                    id="prepaidInpatientHealthPlan"
                                    name="managedCareEntity"
                                    label="Prepaid Inpatient Health Plan (PIHP)"
                                    value="pihp"
                                />
                                <FieldCheckbox
                                    id="prepaidAmbulatoryHealthPlans"
                                    name="managedCareEntity"
                                    label="Prepaid Ambulatory Health Plans (PAHP)"
                                    value="pahp"
                                />
                                <FieldCheckbox
                                    id="primaryCareCaseManagementEntity"
                                    name="managedCareEntity"
                                    label="Primary Care Case Management Entity (PCCM Entity)"
                                    value="pccm"
                                />
                            </Fieldset>
                        </FormGroup>
                        <FormGroup>
                            <Fieldset legend="Items being amended">
                                <Link
                                    asCustom={ReactRouterLink}
                                    to={{
                                        pathname: '/help',
                                        hash:
                                            '#items-being-amended-definitions',
                                    }}
                                >
                                    Items being amended definitions
                                </Link>
                                <div className="usa-hint">
                                    <span>Check all that apply</span>
                                </div>
                                <FieldCheckbox
                                    id="benefitsProvided"
                                    name="itemsAmended"
                                    label="Benefits provided"
                                    value="benefits-provided"
                                />
                                <FieldCheckbox
                                    id="capitationRates"
                                    name="itemsAmended"
                                    label="Capitation rates"
                                    value="capitation-rates"
                                />
                                <div className={styles.nestedOptions}>
                                    <Fieldset legend="Select reason for capitation rate change">
                                        <FieldRadio
                                            id="annualRateUpdate"
                                            name="capitationRates"
                                            label="Annual rate update"
                                            value="annual-rate-update"
                                        />
                                        <FieldRadio
                                            id="midYearUpdate"
                                            name="capitationRates"
                                            label="Mid-year update"
                                            value="mid-year-update"
                                        />
                                        <FieldRadio
                                            id="other"
                                            name="capitationRates"
                                            label="Other (please describe)"
                                            value="other"
                                        />
                                        <FieldTextInput
                                            id="other-rates"
                                            label="Other capitation rate description"
                                            showError={false}
                                            name="otherRates"
                                            type="text"
                                        />
                                    </Fieldset>
                                </div>
                                <FieldCheckbox
                                    id="encounterData"
                                    name="itemsAmended"
                                    label="Encounter data"
                                    value="encounter-data"
                                />
                                <FieldCheckbox
                                    id="enrolleeAccess"
                                    name="itemsAmended"
                                    label="Enrollee access"
                                    value="enrollee-access"
                                />
                                <FieldCheckbox
                                    id="enrollmentDisenrollementProcess"
                                    name="itemsAmended"
                                    label="Enrollment/disenrollment process"
                                    value="enrollment-disenrollment-process"
                                />
                                <FieldCheckbox
                                    id="financialIncentives"
                                    name="itemsAmended"
                                    label="Financial incentives"
                                    value="financial-incentives"
                                />
                                <FieldCheckbox
                                    id="geographicAreaServed"
                                    name="itemsAmended"
                                    label="Geographic area served"
                                    value="geographic-area-served"
                                />
                                <FieldCheckbox
                                    id="grievancesAndAppealsSystem"
                                    name="itemsAmended"
                                    label="Grievances and appeals system"
                                    value="grievances-appeals-system"
                                />
                                <FieldCheckbox
                                    id="lengthOfContractPeriod"
                                    name="itemsAmended"
                                    label="Length of contract period"
                                    value="length-of-contract-period"
                                />
                                <FieldCheckbox
                                    id="nonriskPayment"
                                    name="itemsAmended"
                                    label="Non-risk payment"
                                    value="nonrisk-payment"
                                />
                                <FieldCheckbox
                                    id="programIntegrity"
                                    name="itemsAmended"
                                    label="Program integrity"
                                    value="program-integrity"
                                />
                                <FieldCheckbox
                                    id="qualityStandards"
                                    name="itemsAmended"
                                    label="Quality standards"
                                    value="quality-standards"
                                />
                                <FieldCheckbox
                                    id="riskSharingMechanisms"
                                    name="itemsAmended"
                                    label="Risk sharing mechanisms"
                                    value="risk-sharing-mechanisms"
                                />
                                <FieldCheckbox
                                    id="other"
                                    name="itemsAmended"
                                    label="Other (please describe)"
                                    value="other"
                                />
                                <div className={styles.nestedOptions}>
                                    <FieldTextInput
                                        id="other-items-amended"
                                        label="Other item description"
                                        showError={false}
                                        name="otherItem"
                                        type="text"
                                    />
                                </div>
                            </Fieldset>
                        </FormGroup>
                        <FormGroup>
                            <Fieldset legend="Is this contract action related to the COVID-19 public health emergency?">
                                <FieldRadio
                                    id="covidYes"
                                    name="covidRelated"
                                    label="Yes"
                                    value="covid-yes"
                                />
                                <FieldRadio
                                    id="covidNo"
                                    name="covidRelated"
                                    label="No"
                                    value="covid-no"
                                />
                            </Fieldset>
                        </FormGroup>
                        <FormGroup>
                            <Fieldset legend="Is this related to coverage and reimbursement for vaccine administration?">
                                <FieldRadio
                                    id="vaccineYes"
                                    name="vaccineReimbursement"
                                    label="Yes"
                                    value="vaccine-reimbursement-yes"
                                />
                                <FieldRadio
                                    id="vaccineNo"
                                    name="vaccineReimbursement"
                                    label="No"
                                    value="vaccine-reimbursement-no"
                                />
                            </Fieldset>
                        </FormGroup>
                        <FormGroup>
                            <Fieldset legend="Federal authority your program operates under">
                                <Link
                                    variant="external"
                                    href={
                                        'https://www.medicaid.gov/medicaid/managed-care/managed-care-authorities/index.html'
                                    }
                                    target="_blank"
                                >
                                    Manged Care authority definitions
                                </Link>
                                <div className="usa-hint">
                                    <span>Check all that apply</span>
                                </div>
                                <FieldCheckbox
                                    id="1932aStatePlanAuthority"
                                    name="federalAuthority"
                                    label="1932(a) State Plan Authority"
                                    value="1932a-state-plan-authority"
                                />
                                <FieldCheckbox
                                    id="1915bWaiverAuthority"
                                    name="federalAuthority"
                                    label="1915(b) Waiver Authority"
                                    value="1915b-waiver-authority"
                                />
                                <FieldCheckbox
                                    id="1115WaiverAuthority"
                                    name="federalAuthority"
                                    label="1115 Waiver Authority"
                                    value="1115-waiver-authority"
                                />
                                <FieldCheckbox
                                    id="1915aVoluntaryAuthority"
                                    name="federalAuthority"
                                    label="1915(a) Voluntary Authority"
                                    value="1915a-voluntary-authority"
                                />
                                <FieldCheckbox
                                    id="1937BenchmarkAuthority"
                                    name="federalAuthority"
                                    label="1937 Benchmark Authority"
                                    value="1937-benchmark-authority"
                                />
                                <FieldCheckbox
                                    id="titleXXISeparateChipStatePlanAuthority"
                                    name="federalAuthority"
                                    label="Title XXI Separate CHIP State Plan Authority"
                                    value="title-xxi-separate-chip-state-plan-authority"
                                />
                            </Fieldset>
                        </FormGroup>
                    </fieldset>
                    <ButtonGroup className={styles.buttonGroup}>
                        <Link
                            asCustom={NavLink}
                            className={`${styles.outlineButtonLink} usa-button usa-button--outline`}
                            variant="unstyled"
                            to="/dashboard"
                        >
                            Cancel
                        </Link>
                        <Button type="button" onClick={handleFormSubmit}>
                            Continue
                        </Button>
                    </ButtonGroup>
                </UswdsForm>
            </Formik>
        </>
    )
}
