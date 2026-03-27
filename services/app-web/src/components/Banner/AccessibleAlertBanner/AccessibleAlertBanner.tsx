import React from 'react'
import { Alert } from '@trussworks/react-uswds'
import styles from './AccessibleAlertBanner.module.scss'

type AccessibleAlertProps = React.ComponentProps<typeof Alert>

/**
 * Accessible wrapper for the React-USWDS Alert component that adds in a screen reader
 * only text of the element's role, prepended to the header text.
 *
 * Use this instead of the base Alert component when the heading needs more context on the
 * type of alert being shown.
 */
export const AccessibleAlertBanner = ({
    heading,
    headingLevel,
    role,
    children,
    ...rest
}: AccessibleAlertProps): React.ReactElement => {
    const headingContent = (
        <>
            <span className="srOnly">{`${role}, `}</span>
            {heading}
        </>
    )

    return (
        <div className={styles.accessibleAlertBanner}>
            <Alert
                role={role}
                heading={heading && headingContent}
                headingLevel={headingLevel}
                {...rest}
            >
                {children}
            </Alert>
        </div>
    )
}
