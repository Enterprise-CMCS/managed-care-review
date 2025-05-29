import { Alert } from '@trussworks/react-uswds'
import { useId } from 'react'

type AccessibleAlertProps = React.ComponentProps<typeof Alert>

/**
 * Accessible wrapper for the React-USWDS Alert component that automatically manages
 * aria-labelledby relationships between the alert and its heading.
 *
 * Use this instead of the base Alert component when you need accessible
 * heading associations for colorblind users.
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
            aria-labelledby={heading ? headerID : undefined}
            {...rest}
        >
            {/*Hidden element for the screen reader when navigating by headers, This will announce what this header is for.*/}
            <span
                tabIndex={-1}
                aria-hidden
                id="alert-context"
                className="usa-sr-only"
            >{`${role}, ${heading}`}</span>
            {heading && (
                <Heading
                    id={headerID}
                    className="usa-alert__heading"
                    aria-labelledby="alert-context"
                >
                    {heading}
                </Heading>
            )}
            {children}
        </Alert>
    )
}
