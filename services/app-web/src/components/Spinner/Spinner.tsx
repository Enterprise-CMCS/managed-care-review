import React from 'react'
import classNames from 'classnames'

import styles from './Spinner.module.scss'

// This component is ripped out from the cms-design-system.

export type SpinnerProps = {
    ariaValuetext?: string
    className?: string
    inversed?: boolean
    filled?: boolean
    role?: string
    size?: 'small' | 'big'
}

export const Spinner = ({
    ariaValuetext = 'Loading',
    className,
    inversed = false,
    filled = false,
    role = 'progressbar',
    size,
}: SpinnerProps): React.ReactElement => {
    const allClassNames = classNames(
        styles['ds-c-spinner'],
        size && styles[`ds-c-spinner--${size}`],
        inversed && styles['ds-u-fill--background-inverse'],
        inversed && styles['ds-u-color--base-inverse'],
        filled && styles['ds-c-spinner--filled'],
        className
    )

    return (
        <span
            className={allClassNames}
            aria-label={ariaValuetext}
            aria-valuetext={ariaValuetext}
            role={role}
        />
    )
}
