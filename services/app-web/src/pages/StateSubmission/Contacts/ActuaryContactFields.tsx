import React from 'react'
import { ActuaryContact } from '../../../common-code/healthPlanFormDataType'
import { Field, FormikErrors, FormikValues, getIn } from 'formik'
import { Fieldset, FormGroup } from '@trussworks/react-uswds'
import { FieldRadio, FieldTextInput } from '../../../components/Form'
import { PoliteErrorMessage } from '../../../components/PoliteErrorMessage'
import { RateCertFormType } from '../RateDetails/SingleRateCert/SingleRateCert'
import styles from '../StateSubmissionForm.module.scss'

type FormError =
    FormikErrors<RateCertFormType>[keyof FormikErrors<RateCertFormType>]

type ActuaryFormPropType = {
    actuaryContact: ActuaryContact
    errors: FormikErrors<FormikValues>
    shouldValidate: boolean
    fieldNamePrefix: string
    fieldSetLegend?: string
    inputRef?: React.MutableRefObject<HTMLInputElement | null>
}

export const ActuaryContactFields = ({
    actuaryContact,
    errors,
    shouldValidate,
    fieldNamePrefix,
    fieldSetLegend = 'Actuary Contact',
    inputRef,
}: ActuaryFormPropType) => {
    const showFieldErrors = (error?: FormError) =>
        shouldValidate && Boolean(error)

    if (!actuaryContact) {
        return null
    }

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
            />

            <FieldTextInput
                name={`${fieldNamePrefix}.titleRole`}
                id={`${fieldNamePrefix}.titleRole`}
                label="Title/Role"
                showError={Boolean(
                    showFieldErrors(
                        getIn(errors, `${fieldNamePrefix}.titleRole`)
                    )
                )}
                type="text"
                variant="SUBHEAD"
            />

            <FieldTextInput
                name={`${fieldNamePrefix}.email`}
                id={`${fieldNamePrefix}.email`}
                label="Email"
                showError={Boolean(
                    showFieldErrors(getIn(errors, `${fieldNamePrefix}.email`))
                )}
                type="email"
                variant="SUBHEAD"
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
                    <PoliteErrorMessage>
                        {getIn(errors, `${fieldNamePrefix}.actuarialFirm`)}
                    </PoliteErrorMessage>
                )}
                <FieldRadio
                    id={`${fieldNamePrefix}-mercer`}
                    name={`${fieldNamePrefix}.actuarialFirm`}
                    label="Mercer"
                    value={'MERCER'}
                    aria-required
                />
                <FieldRadio
                    id={`${fieldNamePrefix}-milliman`}
                    name={`${fieldNamePrefix}.actuarialFirm`}
                    label="Milliman"
                    value={'MILLIMAN'}
                    aria-required
                />
                <FieldRadio
                    id={`${fieldNamePrefix}-optumas`}
                    name={`${fieldNamePrefix}.actuarialFirm`}
                    label="Optumas"
                    value={'OPTUMAS'}
                    aria-required
                />
                <FieldRadio
                    id={`${fieldNamePrefix}-guidehouse`}
                    name={`${fieldNamePrefix}.actuarialFirm`}
                    label="Guidehouse"
                    value={'GUIDEHOUSE'}
                    aria-required
                />
                <FieldRadio
                    id={`${fieldNamePrefix}-deloitte`}
                    name={`${fieldNamePrefix}.actuarialFirm`}
                    label="Deloitte"
                    value={'DELOITTE'}
                    aria-required
                />
                <FieldRadio
                    id={`${fieldNamePrefix}-stateInHouse`}
                    name={`${fieldNamePrefix}.actuarialFirm`}
                    label="State in-house"
                    value={'STATE_IN_HOUSE'}
                    aria-required
                />
                <FieldRadio
                    id={`${fieldNamePrefix}-other`}
                    name={`${fieldNamePrefix}.actuarialFirm`}
                    label="Other"
                    value={'OTHER'}
                    aria-required
                />

                {actuaryContact.actuarialFirm === 'OTHER' && (
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
                        <PoliteErrorMessage>
                            {getIn(
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
