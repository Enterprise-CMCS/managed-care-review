import React, { useEffect, useRef } from 'react'
import classnames from 'classnames'

import './index.scss'

type PageHeadingProps = {
    children: React.ReactNode
    className?: string
    headingLevel?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
} & JSX.IntrinsicElements['h1']

/**
 * Drawn from CMSgov/easi-app
 * By default, this is h1 that belongs on every view page.
 * It be used at any heading level if it needs to be read on mount on assistive tech.
 */
const PageHeading = ({
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

export default PageHeading
