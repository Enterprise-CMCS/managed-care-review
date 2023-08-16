import React, { useState, ComponentProps, useLayoutEffect } from 'react'
import { Button as UswdsButton } from '@trussworks/react-uswds'
import classnames from 'classnames'

import styles from './ActionButton.module.scss'

import { Spinner } from '../Spinner'

/* 
Main application-wide action button. 
  This is a react-uswds Button enhanced with accessible support for disabled, loading, and styled as link buttons.
  Most props are passed through, so to understand this component well, reference react-uswds and uswds docs.
*/
type ActionButtonProps = {
    variant?: 'default' | 'secondary' | 'outline' | 'linkStyle' | 'success'
    loading?: boolean
    animationTimeout?: number // used for loading animation
} & ComponentProps<typeof UswdsButton>

export const ActionButton = ({
    disabled,
    children,
    className,
    variant = 'default',
    loading = false,
    animationTimeout = 750,
    onClick,
    ...inheritedProps
}: ActionButtonProps): React.ReactElement | null => {
    const [showLoading, setShowLoading] = useState<boolean | undefined>(
        undefined
    )
    const isDisabled = disabled || inheritedProps['aria-disabled']
    const isLinkStyled = variant === 'linkStyle'
    const isOutline = variant === 'outline'
    const isLoading = loading
    const isSuccess = variant === 'success'

    if (isDisabled && isLoading)
        console.error(
            'CODING ERROR: Incompatible props on ActionButton are being used. Button should not be both loading and disabled at the same time.'
        )

    useLayoutEffect(() => {
        // If there is no animationTimeout, do not use setTimeout else you get flickering UI.
        if (animationTimeout > 0) {
            const timeout = setTimeout(() => {
                setShowLoading(loading)
            }, animationTimeout)
            return function cleanup() {
                clearTimeout(timeout)
            }
        } else {
            setShowLoading(loading)
        }
    }, [loading, animationTimeout])

    const classes = classnames(
        {
            [styles.disabledCursor]: isDisabled || isLoading,
            'usa-button--outline-disabled': isDisabled && isOutline,
            'usa-button--disabled': isDisabled,
            'usa-button--active': isLoading && !isSuccess,
            [styles.successButton]: isSuccess && !isDisabled,
        },
        className
    )

    const variantProps = {
        secondary: variant === 'secondary',
        outline: variant === 'outline',
        unstyled: isLinkStyled,
    }

    const accessibilityProps = {
        'aria-disabled': isDisabled, // prefer aria attributes to HTML disabled attribute
        disabled: false,
        'aria-label':
            !inheritedProps['aria-label'] && isLoading
                ? 'Loading'
                : inheritedProps['aria-label'],
    }

    return (
        <UswdsButton
            onClick={
                isDisabled || isLoading ? (e) => e.preventDefault() : onClick
            }
            {...inheritedProps}
            {...variantProps}
            {...accessibilityProps}
            className={classes}
        >
            {showLoading && <Spinner size="small" />}
            <span
                className={
                    showLoading
                        ? styles.buttonTextWithIcon
                        : styles.buttonTextWithoutIcon
                }
            >
                {showLoading ? 'Loading' : children}
            </span>
        </UswdsButton>
    )
}
