import React from 'react'
import { Alert } from '@trussworks/react-uswds'
import { useId } from 'react'

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
    const Heading = headingLevel
    const headerID = useId()

    // Using JAWS screen reader, the screen reader only span is being focused, this refocuses to the whole header instead
    const headingRef = React.useRef<HTMLHeadingElement>(null)
    const handleSpanFocus = () => {
        if (headingRef.current) {
            headingRef.current.focus()
        }
    }

    return (
        <Alert
            role={role}
            headingLevel={headingLevel}
            {...rest}
            aria-live={'polite'}
            aria-label={role}
        >
            {heading && (
                <Heading
                    ref={headingRef}
                    id={headerID}
                    className="usa-alert__heading"
                >
                    <span
                        className="srOnly"
                        onFocus={handleSpanFocus}
                    >{`${role}, `}</span>
                    {heading}
                </Heading>
            )}
            {children}
        </Alert>
    )
}
