import { Form as UswdsForm, FormGroup, Fieldset, Button, Link, DateRangePicker, Label } from '@trussworks/react-uswds'
import { NavLink, useHistory } from 'react-router-dom'
import PageHeading from '../../../components/PageHeading'
import { FieldRadio } from '../../../components/Form/FieldRadio/FieldRadio'
import { FieldCheckbox } from '../../../components/Form/FieldCheckbox/FieldCheckbox'
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
        history.push(`/submissions/${draftSubmission.id}/documents`)
    }
    return (
        <>  
            <PageHeading className={styles.formHeader} headingLevel="h2"> Contract details </PageHeading>    
            <Formik
                initialValues={{contractType: ""}}
                onSubmit={handleFormSubmit}
            >
                <UswdsForm
                    className={styles.formContainer}
                    id="ContractDetailsForm"
                    aria-label="Contract Details Form"
                    onSubmit={handleFormSubmit}
                >
                    <fieldset className="usa-fieldset">
                        <legend className="srOnly">
                            Contract Details
                        </legend>
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
                                    value="baseContract"
                                />
                                <FieldRadio
                                    id="amendmentContract"
                                    name="contractType"
                                    label="Amendment to base contract"
                                    value="baseContract"
                                />
                            </Fieldset>
                        </FormGroup>
                        <FormGroup>
                            <Fieldset
                                legend="Amendment effective dates"
                            >
                                <DateRangePicker
                                    className={styles.dateRangePicker}
                                    endDateHint="mm/dd/yyyy"
                                    endDateLabel="Start date"
                                    endDatePickerProps={{
                                    disabled: false,
                                    id: 'contract-date-start',
                                    name: 'contract-date-start'
                                    }}
                                    startDateHint="mm/dd/yyyy"
                                    startDateLabel="End date"
                                    startDatePickerProps={{
                                    disabled: false,
                                    id: 'contract-date-end',
                                    name: 'contract-date-end'
                                    }}
                                />
                            </Fieldset>
                        </FormGroup>
                        <FormGroup>
                            <Fieldset
                                legend="Managed Care entities"
                            >
                                <Link
                                    variant="external"
                                    href={
                                        ''
                                    }
                                    target="_blank"
                                >
                                    Items being amended definitions
                                </Link>
                                <div className="usa-hint margin-top-1">Check all that apply</div>
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
                    </fieldset>
                </UswdsForm>
                
            </Formik>
            <Link
                asCustom={NavLink}
                className="usa-button usa-button--outline"
                variant="unstyled"
                to="/dashboard"
            >
                Cancel
            </Link>
            <Button type="button" onClick={handleFormSubmit}>
                Continue
            </Button>
        </>
    )
}
