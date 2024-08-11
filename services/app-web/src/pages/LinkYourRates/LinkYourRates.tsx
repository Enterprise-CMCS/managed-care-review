import React from 'react'

import { Fieldset, FormGroup, Label } from '@trussworks/react-uswds'

import styles from '../StateSubmission/StateSubmissionForm.module.scss'
import { FieldRadio, PoliteErrorMessage } from '../../components'
import { getIn, useFormikContext } from 'formik'
import { LinkRateSelect } from './LinkRateSelect/LinkRateSelect'
import {
    FormikRateForm,
    RateDetailFormConfig,
    convertGQLRateToRateForm,
} from '../StateSubmission/RateDetails'
import { useS3 } from '../../contexts/S3Context'

export type LinkYourRatesProps = {
    fieldNamePrefix: string
    index: number
    shouldValidate: boolean
    autofill: (rateForm: FormikRateForm) => void // used for multi-rates, when called will FieldArray replace the existing form fields with new data
}

export const LinkYourRates = ({
    fieldNamePrefix,
    index,
    autofill,
    shouldValidate,
}: LinkYourRatesProps): React.ReactElement | null => {
    const { values, errors } = useFormikContext<RateDetailFormConfig>()
    const { getKey } = useS3()

    const showFieldErrors = (
        fieldName:
            | 'ratePreviouslySubmitted'
            | 'linkRateSelect'
            | 'rateCertificationName'
    ): string | undefined => {
        if (!shouldValidate) return undefined
        return getIn(errors, `${fieldNamePrefix}.${fieldName}`)
    }

     //We track rates that have already been selected to remove them from the dropdown
     const selectedRatesByID = values.rateForms.reduce((arr: string[] = [], rate ) => {
        if (rate?.id) arr.push(rate.id)
        return arr
     },[])

    return (
        <FormGroup
            data-testid="link-your-rates"
            error={Boolean(
                showFieldErrors('ratePreviouslySubmitted') ||
                    Boolean(showFieldErrors('linkRateSelect'))
            )}
        >
            <Fieldset
                role="radiogroup"
                className={styles.radioGroup}
                aria-required
                legend={
                    'Was this rate certification included with another submission?'
                }
            >
                <span className={styles.requiredOptionalText}>Required</span>
                <PoliteErrorMessage formFieldLabel="Was this rate certification included with another submission?">
                    {showFieldErrors('ratePreviouslySubmitted')}
                </PoliteErrorMessage>
                <FieldRadio
                    id={`ratePreviouslySubmittedNo.${index}.ratePreviouslySubmittedNo`}
                    name={`${fieldNamePrefix}.ratePreviouslySubmitted`}
                    label="No, this rate certification was not included with any other submissions"
                    value={'NO'}
                    onChange={() => {
                        // when someone picks an option, reset the form
                        const emptyRateForm = convertGQLRateToRateForm(getKey)
                        emptyRateForm.ratePreviouslySubmitted = 'NO'
                        autofill(emptyRateForm)
                    }}
                    aria-required
                    list_position={1}
                    list_options={2}
                    radio_button_title="No, this rate certification was not included with any other submissions"
                    parent_component_heading="Was this rate certification included with another submission?"
                />
                <FieldRadio
                    id={`ratePreviouslySubmittedYes.${index}.ratePreviouslySubmittedYes`}
                    name={`${fieldNamePrefix}.ratePreviouslySubmitted`}
                    label="Yes, this rate certification is part of another submission"
                    value={'YES'}
                    onChange={() => {
                        // when someone picks an option, reset the form
                        const emptyRateForm = convertGQLRateToRateForm(getKey)
                        emptyRateForm.ratePreviouslySubmitted = 'YES'
                        autofill(emptyRateForm)
                    }}
                    aria-required
                    list_position={2}
                    list_options={2}
                    radio_button_title="Yes, this rate certification is part of another submission"
                    parent_component_heading="Was this rate certification included with another submission?"
                />
            </Fieldset>
            {getIn(values, `${fieldNamePrefix}.ratePreviouslySubmitted`) ===
                'YES' && (
                <>
                    <Label htmlFor={`${fieldNamePrefix}.linkRateSelect`}>
                        Which rate certification was it?
                    </Label>
                    <span className={styles.requiredOptionalText}>
                        Required
                    </span>
                    <PoliteErrorMessage formFieldLabel="Which rate certification was it?">
                        {showFieldErrors('linkRateSelect')}
                    </PoliteErrorMessage>
                    <LinkRateSelect
                        key={`rateOptions-${index}`}
                        inputId={`${fieldNamePrefix}.linkRateSelect`}
                        name={`${fieldNamePrefix}.linkRateSelect`}
                        initialValue={getIn(values, `${fieldNamePrefix}.id`)}
                        autofill={autofill}
                        label="Which rate certification was it?"
                        alreadySelected={selectedRatesByID}
                    />
                </>
            )}
            <br />
        </FormGroup>
    )
}
