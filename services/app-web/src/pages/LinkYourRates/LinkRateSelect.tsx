import React from 'react'
import Select, { AriaOnFocus } from 'react-select'
import styles from '../../components/Select/Select.module.scss'
import { useIndexRatesQuery } from '../../gen/gqlClient'
import { Fieldset } from '@trussworks/react-uswds'

export interface LinkRateOptionType {
    readonly value: string
    readonly label: string
    readonly isFixed?: boolean
    readonly isDisabled?: boolean
}

export const LinkRateSelect = () => {
    const { data, loading, error } = useIndexRatesQuery()

    const onFocus: AriaOnFocus<LinkRateOptionType> = ({
        focused,
        isDisabled,
    }): string => {
        return `You are currently focused on option ${focused.label}${
            isDisabled ? ', disabled' : ''
        }`
    }

    const noOptionsMessage = () => {
        if (loading) {
            return 'Loading rate certifications...'
        }
        if (error) {
            return 'Could not load rate certifications. Please refresh your browser.'
        }
        if (!data) {
            return 'No rate certifications found'
        }
    }

    return (
        <Fieldset
            data-testid="linkRateSelect"
            role="dropdown"
            aria-required
            legend={'Which rate certification was it?'}
        >
            <span className={styles.requiredOptionalText}>Required</span>
            <Select
                className={styles.multiSelect}
                // options={error || loading ? undefined : data}
                isSearchable
                isMulti
                maxMenuHeight={200}
                ariaLiveMessages={{
                    onFocus,
                }}
                noOptionsMessage={() => noOptionsMessage()}
            />
        </Fieldset>
    )
}
