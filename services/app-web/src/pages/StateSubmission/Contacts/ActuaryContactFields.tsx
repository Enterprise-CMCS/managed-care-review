import React from 'react'
import { ActuaryContact } from '../../../common-code/healthPlanFormDataType'
import { Field, FormikErrors, FormikValues, getIn } from 'formik'
import { Fieldset, FormGroup } from '@trussworks/react-uswds'
import { FieldRadio } from '../../../components/Form'
import { RateInfoFormType } from '../RateDetails/RateDetails'
import { PoliteErrorMessage } from '../../../components/PoliteErrorMessage'

type FormError =
    FormikErrors<RateInfoFormType>[keyof FormikErrors<RateInfoFormType>]

type ActuaryFormPropType = {
    actuaryContacts: ActuaryContact[]
    rateIndex?: number
    errors: FormikErrors<FormikValues>
    shouldValidate: boolean
}

export const ActuaryContactFields = ({
    actuaryContacts,
    rateIndex,
    errors,
    shouldValidate,
}: ActuaryFormPropType) => {
    const showFieldErrors = (error?: FormError) =>
        shouldValidate && Boolean(error)

    if (!actuaryContacts[0]) {
        return null
    }

    return (
        <Fieldset legend="Certifying actuary">
            <FormGroup
                error={showFieldErrors(
                    getIn(
                        errors,
                        `rateInfos.${rateIndex}.actuaryContacts.0.name`
                    )
                )}
            >
                <label
                    htmlFor={`rateInfos.${rateIndex}.actuaryContacts.0.name`}
                >
                    Name
                </label>
                {showFieldErrors(
                    getIn(
                        errors,
                        `rateInfos.${rateIndex}.actuaryContacts.0.name`
                    )
                ) && (
                    <PoliteErrorMessage>
                        {getIn(
                            errors,
                            `rateInfos.${rateIndex}.actuaryContacts.0.name`
                        )}
                    </PoliteErrorMessage>
                )}
                <Field
                    name={`rateInfos.${rateIndex}.actuaryContacts.0.name`}
                    id={`rateInfos.${rateIndex}.actuaryContacts.0.name`}
                    aria-required
                    type="text"
                    className="usa-input"
                />
            </FormGroup>

            <FormGroup
                error={showFieldErrors(
                    getIn(
                        errors,
                        `rateInfos.${rateIndex}.actuaryContacts.0.titleRole`
                    )
                )}
            >
                <label
                    htmlFor={`rateInfos.${rateIndex}.actuaryContacts.0.titleRole`}
                >
                    Title/Role
                </label>
                {showFieldErrors(
                    getIn(
                        errors,
                        `rateInfos.${rateIndex}.actuaryContacts.0.titleRole`
                    )
                ) && (
                    <PoliteErrorMessage>
                        {getIn(
                            errors,
                            `rateInfos.${rateIndex}.actuaryContacts.0.titleRole`
                        )}
                    </PoliteErrorMessage>
                )}
                <Field
                    name={`rateInfos.${rateIndex}.actuaryContacts.0.titleRole`}
                    id={`rateInfos.${rateIndex}.actuaryContacts.0.titleRole`}
                    aria-required
                    type="text"
                    className="usa-input"
                />
            </FormGroup>

            <FormGroup
                error={showFieldErrors(
                    getIn(
                        errors,
                        `rateInfos.${rateIndex}.actuaryContacts.0.email`
                    )
                )}
            >
                <label
                    htmlFor={`rateInfos.${rateIndex}.actuaryContacts.0.email`}
                >
                    Email
                </label>
                {showFieldErrors(
                    getIn(
                        errors,
                        `rateInfos.${rateIndex}.actuaryContacts.0.email`
                    )
                ) && (
                    <PoliteErrorMessage>
                        {getIn(
                            errors,
                            `rateInfos.${rateIndex}.actuaryContacts.0.email`
                        )}
                    </PoliteErrorMessage>
                )}
                <Field
                    name={`rateInfos.${rateIndex}.actuaryContacts.0.email`}
                    id={`rateInfos.${rateIndex}.actuaryContacts.0.email`}
                    aria-required
                    type="text"
                    className="usa-input"
                />
            </FormGroup>

            <FormGroup
                error={showFieldErrors(
                    getIn(
                        errors,
                        `rateInfos.${rateIndex}.actuaryContacts.0.actuarialFirm`
                    )
                )}
            >
                <label
                    htmlFor={`rateInfos.${rateIndex}.actuaryContacts.0.actuarialFirm`}
                >
                    Actuarial firm
                </label>
                {showFieldErrors(
                    getIn(
                        errors,
                        `rateInfos.${rateIndex}.actuaryContacts.0.actuarialFirm`
                    )
                ) && (
                    <PoliteErrorMessage>
                        {getIn(
                            errors,
                            `rateInfos.${rateIndex}.actuaryContacts.0.actuarialFirm`
                        )}
                    </PoliteErrorMessage>
                )}
                <FieldRadio
                    id={`mercer-${rateIndex}`}
                    name={`rateInfos.${rateIndex}.actuaryContacts.0.actuarialFirm`}
                    label="Mercer"
                    value={'MERCER'}
                    aria-required
                />
                <FieldRadio
                    id={`milliman-${rateIndex}`}
                    name={`rateInfos.${rateIndex}.actuaryContacts.0.actuarialFirm`}
                    label="Milliman"
                    value={'MILLIMAN'}
                    aria-required
                />
                <FieldRadio
                    id={`optumas-${rateIndex}`}
                    name={`rateInfos.${rateIndex}.actuaryContacts.0.actuarialFirm`}
                    label="Optumas"
                    value={'OPTUMAS'}
                    aria-required
                />
                <FieldRadio
                    id={`guidehouse-${rateIndex}`}
                    name={`rateInfos.${rateIndex}.actuaryContacts.0.actuarialFirm`}
                    label="Guidehouse"
                    value={'GUIDEHOUSE'}
                    aria-required
                />
                <FieldRadio
                    id={`deloitte-${rateIndex}`}
                    name={`rateInfos.${rateIndex}.actuaryContacts.0.actuarialFirm`}
                    label="Deloitte"
                    value={'DELOITTE'}
                    aria-required
                />
                <FieldRadio
                    id={`stateInHouse-${rateIndex}`}
                    name={`rateInfos.${rateIndex}.actuaryContacts.0.actuarialFirm`}
                    label="State in-house"
                    value={'STATE_IN_HOUSE'}
                    aria-required
                />
                <FieldRadio
                    id={`other-${rateIndex}`}
                    name={`rateInfos.${rateIndex}.actuaryContacts.0.actuarialFirm`}
                    label="Other"
                    value={'OTHER'}
                    aria-required
                />

                {actuaryContacts[0]?.actuarialFirm === 'OTHER' && (
                    <FormGroup
                        error={showFieldErrors(
                            getIn(
                                errors,
                                `rateInfos.${rateIndex}.actuaryContacts.0.actuarialFirmOther`
                            )
                        )}
                    >
                        <label
                            htmlFor={`rateInfos.${rateIndex}.actuaryContacts.0.actuarialFirmOther`}
                        >
                            Other actuarial firm
                        </label>
                        {showFieldErrors(
                            getIn(
                                errors,
                                `rateInfos.${rateIndex}.actuaryContacts.0.actuarialFirmOther`
                            )
                        ) && (
                            <PoliteErrorMessage>
                                {getIn(
                                    errors,
                                    `rateInfos.${rateIndex}.actuaryContacts.0.actuarialFirmOther`
                                )}
                            </PoliteErrorMessage>
                        )}
                        <Field
                            name={`rateInfos.${rateIndex}.actuaryContacts.0.actuarialFirmOther`}
                            id={`rateInfos.${rateIndex}.actuaryContacts.0.actuarialFirmOther`}
                            type="text"
                            className="usa-input"
                        />
                    </FormGroup>
                )}
            </FormGroup>
        </Fieldset>
    )
}
