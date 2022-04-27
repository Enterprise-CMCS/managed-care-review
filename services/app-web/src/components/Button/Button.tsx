import React, { useEffect, useState, ComponentProps } from 'react'
import { Button as UswdsButton } from '@trussworks/react-uswds'
import classnames from 'classnames'

import styles from './Button.module.scss'

import { Spinner } from '../Spinner'

/* 
Main application-wide action button. 
  This is a react-uswds Button enhanced with accessible support for disabled, loading, and styled as link buttons.
  Most props are passed through, so to understand this component well, reference react-uswds docs.


*/
type ButtonProps = {
    variant: 'primary' | 'secondary' | 'outline' | 'linkStyle'
    loading?: boolean
    animationTimeout?: number // used for loading animation
} & ComponentProps<typeof UswdsButton>

export const Button = ({
    disabled,
    children,
    className,
    variant,
    loading = false,
    animationTimeout = 750,
    ...inheritedProps
}: ButtonProps): React.ReactElement => {
    const [showLoading, setShowLoading] = useState(false)
    const isDisabled = disabled || inheritedProps['aria-disabled']
    const isLinkStyled = variant === 'linkStyle'
    const isOutline = variant === 'outline'
    const isLoading = loading

    useEffect(() => {
        if (loading) {
            const timeout = setTimeout(() => {
                setShowLoading(true)
            }, animationTimeout)
            return function cleanup() {
                clearTimeout(timeout)
            }
        }
    }, [loading, animationTimeout])

    const classes = classnames(
        {
            [styles.disabledCursor]: isDisabled || isLoading,
            [styles.disabledButtonBase]: isDisabled && !isLinkStyled,
            [`usa-button--outline-disabled ${styles.disabledButtonOutline}`]:
                isDisabled && isOutline,
            'usa-button--active': isLoading,
        },
        className
    )

    const variantProps = {
        primary: variant === 'primary',
        secondary: variant === 'secondary',
        outline: variant === 'outline',
        unstyled: isLinkStyled,
    }

    // prefer aria attributes to HTML disabled attribute
    const ariaLabel =
        inheritedProps['aria-label'] && isDisabled
            ? `${inheritedProps['aria-label']} (disabled)`
            : null

    const accessibilityProps = {
        ariaDisabled: isDisabled,
        disabled: false,
        ariaLabel: ariaLabel,
    }

    return (
        <UswdsButton
            {...inheritedProps}
            {...variantProps}
            {...accessibilityProps}
            className={classes}
        >
            {showLoading && <Spinner size="small" />}
            <span className={showLoading ? styles.buttonTextWithIcon : ''}>
                {showLoading ? 'Loading' : children}
            </span>
        </UswdsButton>
    )
}
