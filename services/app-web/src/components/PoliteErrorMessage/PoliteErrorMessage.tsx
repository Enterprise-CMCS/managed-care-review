import React from 'react'
import classnames from 'classnames'

type PoliteErrorMessageProps = {
    children: React.ReactNode
    id?: string
    className?: string
} & JSX.IntrinsicElements['span']

// This component is almost the same as react-uswds ErrorMessage, but by default polite :). It also is more flexible in handling other html attributes and aria-roles through remaining props
export const PoliteErrorMessage = ({
    children,
    className,
    id,
    ...remainingProps
}: PoliteErrorMessageProps): React.ReactElement => {
    const classes = classnames('usa-error-message', className)

    return (
        <span
            data-testid="errorMessage"
            className={classes}
            id={id}
            role="alert"
            aria-live="polite"
            {...remainingProps}
        >
            {children}
        </span>
    )
}

export default PoliteErrorMessage
