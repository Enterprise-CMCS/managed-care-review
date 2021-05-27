import {
    Form as UswdsForm,
    FormGroup,
    Fieldset,
    Button,
    Link,
    DateRangePicker,
    DatePicker,
    ButtonGroup,
    Label,
    Checkbox
} from '@trussworks/react-uswds'
import { Link as ReactRouterLink, NavLink, useHistory } from 'react-router-dom'
import PageHeading from '../../../components/PageHeading'
import { FieldRadio } from '../../../components/Form/FieldRadio/FieldRadio'
import { FieldCheckbox } from '../../../components/Form/FieldCheckbox/FieldCheckbox'
import { FieldTextInput } from '../../../components/Form/FieldTextInput/FieldTextInput'
import { DraftSubmission } from '../../../gen/gqlClient'
import { Formik } from 'formik'
import styles from '../StateSubmissionForm.module.scss'

export const RateDetails = ({
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
            <PageHeading className={styles.formHeader} headingLevel="h2">
                Rate details
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
                                legend="Rate certification type"
                            >
                                <FieldRadio
                                    id="newRate"
                                    name="rateType"
                                    label="New rate certification"
                                    value="new-rate"
                                />
                                <FieldRadio
                                    id="amendmentRate"
                                    name="rateType"
                                    label="Amendment to prior rate certification"
                                    value="amendment-rate"
                                />
                            </Fieldset>
                        </FormGroup>
                        <FormGroup>
                            <Fieldset legend="Rating period">
                                <DateRangePicker
                                    className={styles.dateRangePicker}
                                    endDateHint="mm/dd/yyyy"
                                    endDateLabel="End date"
                                    endDatePickerProps={{
                                        disabled: false,
                                        id: 'rateDateEnd',
                                        name: 'rate-date-end',
                                    }}
                                    startDateHint="mm/dd/yyyy"
                                    startDateLabel="Start date"
                                    startDatePickerProps={{
                                        disabled: false,
                                        id: 'rateDateStart',
                                        name: 'rate-date-start',
                                    }}
                                />
                            </Fieldset>
                        </FormGroup>
                        <FormGroup>
                            <Label
                                htmlFor="certification-date"
                                id="certificationDateLabel"
                            >Date certified
                            </Label>
                            <div
                            className="usa-hint"
                            id="certificationDateHint"
                            >mm/dd/yyyy
                            </div>
                            <DatePicker
                                aria-describedby="certificationDateLabel certificationDateHint"
                                id="certificationDate"
                                name="certification-date"
                            />
                        </FormGroup>
                        <FormGroup>
                            <Fieldset legend="Rating period of original rate certification">
                                <DateRangePicker
                                    className={styles.dateRangePicker}
                                    endDateHint="mm/dd/yyyy"
                                    endDateLabel="End date"
                                    endDatePickerProps={{
                                        disabled: false,
                                        id: 'originalRateDateEnd',
                                        name: 'original-rate-date-end',
                                    }}
                                    startDateHint="mm/dd/yyyy"
                                    startDateLabel="Start date"
                                    startDatePickerProps={{
                                        disabled: false,
                                        id: 'originalRateDateStart',
                                        name: 'original-rate-date-start',
                                    }}
                                />
                            </Fieldset>
                        </FormGroup>
                        <FormGroup>
                            <Fieldset legend="Effective dates of rate amendment">
                                <FieldCheckbox
                                    name="same-as-original-rate"
                                    label="Use same dates as original rating period"
                                    id="SameAsOriginalRatePeriod"
                                />
                                <DateRangePicker
                                    className={styles.dateRangePicker}
                                    endDateHint="mm/dd/yyyy"
                                    endDateLabel="End date"
                                    endDatePickerProps={{
                                        disabled: false,
                                        id: 'amendmentRateDateEnd',
                                        name: 'amendment-rate-date-end',
                                    }}
                                    startDateHint="mm/dd/yyyy"
                                    startDateLabel="Start date"
                                    startDatePickerProps={{
                                        disabled: false,
                                        id: 'amendmentRateDateStart',
                                        name: 'amendment-rate-date-start',
                                    }}
                                />
                            </Fieldset>
                        </FormGroup>
                        <FormGroup>
                            <Label
                                htmlFor="amendment-certification-date"
                                id="amendmentCertificationDateLabel"
                            >Date certified for rate amendment
                            </Label>
                            <div
                            className="usa-hint"
                            id="amendmentCertificationDateHint"
                            >mm/dd/yyyy
                            </div>
                            <DatePicker
                                aria-describedby="amendmentCertificationDateLabel amendmentCertificationDateHint"
                                id="amendmentCertificationDate"
                                name="amendment-certification-date"
                            />
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
