import React from 'react'
import { FieldRadio } from '../FieldRadio/FieldRadio'
import styles from './FieldRadioCard.module.scss'

/**
 * This component renders a radio button inside a card.
 */
export const FieldRadioCard = (
    inputProps: React.ComponentProps<typeof FieldRadio>
): React.ReactElement => {
    return (
        <div className={styles.radioCardContainer}>
            <FieldRadio {...inputProps} />
        </div>
    )
}
