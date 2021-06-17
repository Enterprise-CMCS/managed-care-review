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
} from '@trussworks/react-uswds'
import { NavLink, useHistory } from 'react-router-dom'
import PageHeading from '../../../components/PageHeading'
import { FieldRadio } from '../../../components/Form/FieldRadio/FieldRadio'
import { FieldCheckbox } from '../../../components/Form/FieldCheckbox/FieldCheckbox'
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
            <Formik initialValues={{ newRate: '' }} onSubmit={handleFormSubmit}>
                <UswdsForm
                    className={styles.formContainer}
                    id="RateDetailsForm"
                    aria-label="Rate Details Form"
                    onSubmit={handleFormSubmit}
                >
                    <fieldset className="usa-fieldset">
                        <legend className="srOnly">Rate Details</legend>
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
                                    value="newRate"
                                />
                                <FieldRadio
                                    id="amendmentRate"
                                    name="rateType"
                                    label="Amendment to prior rate certification"
                                    value="amendmentRate"
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
                                        name: 'rateDateEnd',
                                    }}
                                    startDateHint="mm/dd/yyyy"
                                    startDateLabel="Start date"
                                    startDatePickerProps={{
                                        disabled: false,
                                        id: 'rateDateStart',
                                        name: 'rateDateStart',
                                    }}
                                />
                            </Fieldset>
                        </FormGroup>
                        <FormGroup>
                            <Label
                                htmlFor="certification-date"
                                id="certificationDateLabel"
                            >
                                Date certified
                            </Label>
                            <div
                                className="usa-hint"
                                id="certificationDateHint"
                            >
                                mm/dd/yyyy
                            </div>
                            <DatePicker
                                aria-describedby="certificationDateLabel certificationDateHint"
                                id="certificationDate"
                                name="certificationDate"
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
                                        name: 'originalRateDateEnd',
                                    }}
                                    startDateHint="mm/dd/yyyy"
                                    startDateLabel="Start date"
                                    startDatePickerProps={{
                                        disabled: false,
                                        id: 'originalRateDateStart',
                                        name: 'originalRateDateStart',
                                    }}
                                />
                            </Fieldset>
                        </FormGroup>
                        <FormGroup>
                            <Fieldset legend="Effective dates of rate amendment">
                                <FieldCheckbox
                                    name="sameAsOriginalRatePeriod"
                                    label="Use same dates as original rating period"
                                    id="sameAsOriginalRatePeriod"
                                />
                                <DateRangePicker
                                    className={styles.dateRangePicker}
                                    endDateHint="mm/dd/yyyy"
                                    endDateLabel="End date"
                                    endDatePickerProps={{
                                        disabled: false,
                                        id: 'amendmentRateDateEnd',
                                        name: 'amendmentRateDateEnd',
                                    }}
                                    startDateHint="mm/dd/yyyy"
                                    startDateLabel="Start date"
                                    startDatePickerProps={{
                                        disabled: false,
                                        id: 'amendmentRateDateStart',
                                        name: 'amendmentRateDateEnd',
                                    }}
                                />
                            </Fieldset>
                        </FormGroup>
                        <FormGroup>
                            <Label
                                htmlFor="amendment-certification-date"
                                id="amendmentCertificationDateLabel"
                            >
                                Date certified for rate amendment
                            </Label>
                            <div
                                className="usa-hint"
                                id="amendmentCertificationDateHint"
                            >
                                mm/dd/yyyy
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
