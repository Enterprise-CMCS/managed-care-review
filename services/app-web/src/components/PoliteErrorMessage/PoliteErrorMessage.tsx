import React, { forwardRef } from 'react'
import classnames from 'classnames'

type PoliteErrorMessageProps = {
    children: React.ReactNode
    id?: string
    className?: string
} & JSX.IntrinsicElements['span']

export type PoliteErrorMessageRef = React.Ref<HTMLSpanElement> | null
// This component is almost the same as react-uswds ErrorMessage, but by default polite :).
// It also is more flexible in handling other html attributes and aria-roles through remaining props
// If no children exist, render nothing
export const PoliteErrorMessage = forwardRef(
    (
        { children, className, id, ...remainingProps }: PoliteErrorMessageProps,
        ref: PoliteErrorMessageRef
    ): React.ReactElement | null => {
        if (!children) return null

        const classes = classnames('usa-error-message', className)

        return (
            <span
                data-testid="errorMessage"
                className={classes}
                id={id}
                role="alert"
                aria-live="polite"
                {...remainingProps}
                ref={ref}
            >
                {children}
            </span>
        )
    }
)

export default PoliteErrorMessage
