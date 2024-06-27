import React from 'react'

import { Fieldset, FormGroup, Label } from '@trussworks/react-uswds'

import styles from '../StateSubmission/StateSubmissionForm.module.scss'
import { FieldRadio, PoliteErrorMessage } from '../../components'
import { getIn, useFormikContext } from 'formik'
import { LinkRateSelect } from './LinkRateSelect'
import {
    FormikRateForm,
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
    const { values, errors } = useFormikContext()
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
                <PoliteErrorMessage>
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
                    <PoliteErrorMessage>
                        {showFieldErrors('linkRateSelect')}
                    </PoliteErrorMessage>
                    <LinkRateSelect
                        key={`rateOptions-${index}`}
                        inputId={`${fieldNamePrefix}.linkRateSelect`}
                        name={`${fieldNamePrefix}.linkRateSelect`}
                        initialValue={getIn(values, `${fieldNamePrefix}.id`)}
                        autofill={autofill}
                    />
                </>
            )}
            <br />
        </FormGroup>
    )
}
