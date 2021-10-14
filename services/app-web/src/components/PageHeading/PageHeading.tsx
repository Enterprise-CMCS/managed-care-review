import React, { useEffect, useRef } from 'react'
import classnames from 'classnames'

import './PageHeading.module.scss'

type PageHeadingProps = {
    children: React.ReactNode
    className?: string
    headingLevel?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
} & JSX.IntrinsicElements['h1']

/**
 * This heading is used to direct focus within the app for assistive tech.
 * Drawn from CMSgov/easi-app.
 */
export const PageHeading = ({
    children,
    className,
    headingLevel,
    ...props
}: PageHeadingProps): React.ReactElement => {
    const headingRef = useRef<HTMLHeadingElement>(null)
    const Component = headingLevel || 'h1'
    const classes = classnames('heading', className)

    useEffect(() => {
        headingRef.current?.focus()
    }, [children])

    return (
        <Component
            className={classes}
            tabIndex={-1}
            ref={headingRef}
            aria-live="polite"
            {...props}
        >
            {children}
        </Component>
    )
}
