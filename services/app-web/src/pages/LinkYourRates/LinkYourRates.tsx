import React from 'react'

import { Fieldset, FormGroup } from '@trussworks/react-uswds'

import styles from '../StateSubmission/StateSubmissionForm.module.scss'
import { FieldRadio } from '../../components'
import { getIn, useFormikContext } from 'formik'
import { LinkRateSelect } from './LinkRateSelect'

// export type LinkYourRatesProps = {

// }

export const LinkYourRates = (): React.ReactElement | null => {
    const { values } = useFormikContext()

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
                    id="ratePreviouslySubmittedNo"
                    name="ratePreviouslySubmitted"
                    label="No, this rate certification was not included with any other submissions"
                    value={'NO'}
                    aria-required
                />
                <FieldRadio
                    id="ratePreviouslySubmittedYes"
                    name="ratePreviouslySubmitted"
                    label="Yes, this rate certification is part of another submission"
                    value={'YES'}
                    aria-required
                />
            </Fieldset>
            <br />
            {getIn(values, 'ratePreviouslySubmitted') === 'YES' && (
                <LinkRateSelect />
            )}
        </FormGroup>
    )
}
