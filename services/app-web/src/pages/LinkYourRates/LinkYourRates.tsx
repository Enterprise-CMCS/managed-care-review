import React from 'react'

import { Fieldset, FormGroup, Label } from '@trussworks/react-uswds'

import styles from '../StateSubmission/StateSubmissionForm.module.scss'
import { FieldRadio } from '../../components'
import { getIn, useFormikContext } from 'formik'
import { LinkRateOptionType, LinkRateSelect } from './LinkRateSelect'

export type LinkYourRatesProps = {
    fieldNamePrefix: string
    index: number
}

export const LinkYourRates = ({
    fieldNamePrefix,
    index,
}: LinkYourRatesProps): React.ReactElement | null => {
    const { values, setFieldValue } = useFormikContext()

    return (
        <FormGroup data-testid="link-your-rates">
            <Fieldset
                role="radiogroup"
                aria-required
                legend={
                    'Was this rate certification included with another submission?'
                }
            >
                <span className={styles.requiredOptionalText}>Required</span>
                <FieldRadio
                    id={`ratePreviouslySubmittedNo.${index}.ratePreviouslySubmittedNo`}
                    name={`${fieldNamePrefix}.ratePreviouslySubmitted`}
                    label="No, this rate certification was not included with any other submissions"
                    value={'NO'}
                    aria-required
                />
                <FieldRadio
                    id={`ratePreviouslySubmittedYes.${index}.ratePreviouslySubmittedYes`}
                    name={`${fieldNamePrefix}.ratePreviouslySubmitted`}
                    label="Yes, this rate certification is part of another submission"
                    value={'YES'}
                    aria-required
                />
            </Fieldset>
            {getIn(values, `${fieldNamePrefix}.ratePreviouslySubmitted`) ===
                'YES' && (
                <>
                    <Label htmlFor={`${fieldNamePrefix}.linkedRates`}>
                        Which rate certification was it?
                    </Label>
                    <span className={styles.requiredOptionalText}>
                        Required
                    </span>
                    <LinkRateSelect
                        key={`rateOptions-${index}`}
                        inputId={`${fieldNamePrefix}.linkedRates`}
                        name={`${fieldNamePrefix}.linkedRates`}
                        initialValues={getIn(
                            values,
                            `${fieldNamePrefix}.linkedRates`
                        ).map((item: { rateId: string; rateName: string }) =>
                            item.rateId ? item.rateId : ''
                        )}
                        onChange={(selectedOptions) =>
                            setFieldValue(
                                `${fieldNamePrefix}.linkedRates`,
                                selectedOptions.map(
                                    (item: LinkRateOptionType) => {
                                        return {
                                            rateId: item.value,
                                            rateName: item.label,
                                        }
                                    }
                                )
                            )
                        }
                    />
                </>
            )}
            <br />
        </FormGroup>
    )
}
