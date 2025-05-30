import { Alert } from '@trussworks/react-uswds'
import { useId } from 'react'

type AccessibleAlertProps = React.ComponentProps<typeof Alert> & {
    role?: 'status' | 'alert'
}

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
    const Heading = headingLevel
    const headerID = useId()
    return (
        <Alert
            role={role}
            headingLevel={headingLevel}
            {...rest}
            aria-live={'polite'}
            aria-label={role}
        >
            {heading && (
                <Heading id={headerID} className="usa-alert__heading">
                    {/*/!*Hidden element for the screen reader when navigating by headers, This will announce what this header is for.*!/*/}
                    <span className="srOnly">{`${role}, `}</span>
                    {heading}
                </Heading>
            )}
            {children}
        </Alert>
    )
}
