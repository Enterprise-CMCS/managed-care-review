import React, { ComponentProps } from 'react'
import { Button as UswdsButton } from '@trussworks/react-uswds'
import styles from './Button.module.scss'
import classnames from 'classnames'

/* 
Main application-wide action button. 
  This is a react-uswds Button enhanced with accessible support for disabled, loading, and styled as link buttons.
  Most props are passed through, so to understand this component well, reference react-uswds docs.


*/
type ButtonProps = {
    variant: 'primary' | 'secondary' | 'outline' | 'linkStyle' | 'loading'
} & ComponentProps<typeof UswdsButton>

export const Button = ({
    disabled,
    children,
    className,
    variant,
    ...inheritedProps
}: ButtonProps): React.ReactElement => {
    const isDisabled = disabled || inheritedProps['aria-disabled']
    const isLinkStyled = variant === 'linkStyle'
    const isOutline = variant === 'outline'

    const classes = classnames(
        {
            [styles.disabled]: isDisabled,
            [styles.disabledButtonStyle]: isDisabled && !isLinkStyled,
            [`usa-button--outline-disabled ${styles.disabledOutlineStyle}`]:
                isDisabled && isOutline,
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
    const ariaLabel = inheritedProps['aria-label']
    const accessibilityProps = {
        ariaDisabled: isDisabled,
        disabled: false,
        ariaLabel: isDisabled
            ? ariaLabel
                ? `${ariaLabel} (disabled)`
                : '(disabled)'
            : inheritedProps['aria-label'] || '',
    }

    return (
        <UswdsButton
            {...inheritedProps}
            {...variantProps}
            {...accessibilityProps}
            className={classes}
        >
            {children}
        </UswdsButton>
    )
}
