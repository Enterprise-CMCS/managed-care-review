import React from 'react'
import { Field, FormikErrors, getIn, useFormikContext } from 'formik'
import { Fieldset, FormGroup } from '@trussworks/react-uswds'
import { FieldRadio, FieldTextInput } from '../../../components/Form'
import { PoliteErrorMessage } from '../../../components/PoliteErrorMessage'
import { RateCertFormType } from '../RateDetails/SingleRateCert'
import styles from '../StateSubmissionForm.module.scss'

/**
 * This component renders actuary contact related form fields with their labels and error messages
 *
 * It relies on useFormikContext hook to work inside of a Formik form with matching field name values
 */

type FormError =
    FormikErrors<RateCertFormType>[keyof FormikErrors<RateCertFormType>]

type ActuaryFormPropType = {
    shouldValidate: boolean
    fieldNamePrefix: string
    fieldSetLegend?: string
    inputRef?: React.MutableRefObject<HTMLInputElement | null>
}

export const ActuaryContactFields = ({
    shouldValidate,
    fieldNamePrefix,
    fieldSetLegend = 'Actuary Contact',
    inputRef,
}: ActuaryFormPropType) => {
    const { values, errors } = useFormikContext()
    const showFieldErrors = (error?: FormError) =>
        shouldValidate && Boolean(error)
    const testIdPrefix = fieldNamePrefix.includes('actuaryContacts')
        ? 'actuaryContacts'
        : 'addtlActuaryContacts'
    return (
        <Fieldset legend={fieldSetLegend}>
            <span className={styles.requiredOptionalText}>Required</span>
            <FieldTextInput
                name={`${fieldNamePrefix}.name`}
                id={`${fieldNamePrefix}.name`}
                label="Name"
                showError={Boolean(
                    showFieldErrors(getIn(errors, `${fieldNamePrefix}.name`))
                )}
                type="text"
                inputRef={inputRef}
                variant="SUBHEAD"
                aria-required
                data-testid={`${testIdPrefix}.name`}
            />

            <FieldTextInput
                name={`${fieldNamePrefix}.titleRole`}
                id={`${fieldNamePrefix}.titleRole`}
                label="Title/Role"
                aria-required
                showError={Boolean(
                    showFieldErrors(
                        getIn(errors, `${fieldNamePrefix}.titleRole`)
                    )
                )}
                type="text"
                variant="SUBHEAD"
                data-testid={`${testIdPrefix}.titleRole`}
            />

            <FieldTextInput
                name={`${fieldNamePrefix}.email`}
                id={`${fieldNamePrefix}.email`}
                label="Email"
                aria-required
                showError={Boolean(
                    showFieldErrors(getIn(errors, `${fieldNamePrefix}.email`))
                )}
                type="email"
                variant="SUBHEAD"
                data-testid={`${testIdPrefix}.email`}
            />

            <FormGroup
                error={showFieldErrors(
                    getIn(errors, `${fieldNamePrefix}.actuarialFirm`)
                )}
            >
                <label htmlFor={`${fieldNamePrefix}.actuarialFirm`}>
                    Actuarial firm
                </label>
                <span className={styles.requiredOptionalText}>Required</span>
                {showFieldErrors(
                    getIn(errors, `${fieldNamePrefix}.actuarialFirm`)
                ) && (
                    <PoliteErrorMessage formFieldLabel="Actuarial firm">
                        {getIn(errors, `${fieldNamePrefix}.actuarialFirm`)}
                    </PoliteErrorMessage>
                )}
                <FieldRadio
                    id={`${fieldNamePrefix}-mercer`}
                    name={`${fieldNamePrefix}.actuarialFirm`}
                    label="Mercer"
                    value={'MERCER'}
                    aria-required
                    data-testid={`${testIdPrefix}.mercer`}
                    list_position={1}
                    list_options={7}
                    parent_component_heading="Actuarial firm"
                    radio_button_title="Mercer"
                />
                <FieldRadio
                    id={`${fieldNamePrefix}-milliman`}
                    name={`${fieldNamePrefix}.actuarialFirm`}
                    label="Milliman"
                    value={'MILLIMAN'}
                    aria-required
                    data-testid={`${testIdPrefix}.milliman`}
                    list_position={2}
                    list_options={7}
                    parent_component_heading="Actuarial firm"
                    radio_button_title="Milliman"
                />
                <FieldRadio
                    id={`${fieldNamePrefix}-optumas`}
                    name={`${fieldNamePrefix}.actuarialFirm`}
                    label="Optumas"
                    value={'OPTUMAS'}
                    aria-required
                    data-testid={`${testIdPrefix}.optumas`}
                    list_position={3}
                    list_options={7}
                    parent_component_heading="Actuarial firm"
                    radio_button_title="Optumas"
                />
                <FieldRadio
                    id={`${fieldNamePrefix}-guidehouse`}
                    name={`${fieldNamePrefix}.actuarialFirm`}
                    label="Guidehouse"
                    value={'GUIDEHOUSE'}
                    aria-required
                    data-testid={`${testIdPrefix}.guidehouse`}
                    list_position={4}
                    list_options={7}
                    parent_component_heading="Actuarial firm"
                    radio_button_title="Guidehouse"
                />
                <FieldRadio
                    id={`${fieldNamePrefix}-deloitte`}
                    name={`${fieldNamePrefix}.actuarialFirm`}
                    label="Deloitte"
                    value={'DELOITTE'}
                    aria-required
                    data-testid={`${testIdPrefix}.deloitte`}
                    list_position={5}
                    list_options={7}
                    parent_component_heading="Actuarial firm"
                    radio_button_title="Deloitte"
                />
                <FieldRadio
                    id={`${fieldNamePrefix}-stateInHouse`}
                    name={`${fieldNamePrefix}.actuarialFirm`}
                    label="State in-house"
                    value={'STATE_IN_HOUSE'}
                    aria-required
                    data-testid={`${testIdPrefix}.stateInHouse`}
                    list_position={6}
                    list_options={7}
                    parent_component_heading="Actuarial firm"
                    radio_button_title="State in-house"
                />
                <FieldRadio
                    id={`${fieldNamePrefix}-other`}
                    name={`${fieldNamePrefix}.actuarialFirm`}
                    label="Other"
                    value={'OTHER'}
                    aria-required
                    data-testid={`${testIdPrefix}.other`}
                    list_position={7}
                    list_options={7}
                    parent_component_heading="Actuarial firm"
                    radio_button_title="Other"
                />

                {getIn(values, `${fieldNamePrefix}.actuarialFirm`) ===
                    'OTHER' && (
                    <FormGroup
                        error={showFieldErrors(
                            getIn(
                                errors,
                                `${fieldNamePrefix}.actuarialFirmOther`
                            )
                        )}
                    >
                        <label
                            htmlFor={`${fieldNamePrefix}.actuarialFirmOther`}
                        >
                            Other actuarial firm
                        </label>
                        <PoliteErrorMessage formFieldLabel="Other actuarial firm">
                            {showFieldErrors(
                                getIn(
                                    errors,
                                    `${fieldNamePrefix}.actuarialFirmOther`
                                )
                            ) &&
                                getIn(
                                    errors,
                                    `${fieldNamePrefix}.actuarialFirmOther`
                                )}
                        </PoliteErrorMessage>
                        <Field
                            name={`${fieldNamePrefix}.actuarialFirmOther`}
                            id={`${fieldNamePrefix}.actuarialFirmOther`}
                            type="text"
                            className="usa-input"
                        />
                    </FormGroup>
                )}
            </FormGroup>
        </Fieldset>
    )
}
