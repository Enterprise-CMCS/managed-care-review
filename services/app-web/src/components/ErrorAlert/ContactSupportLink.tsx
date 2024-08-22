import React from 'react'
import { useStringConstants } from '../../hooks/useStringConstants'
import { LinkWithLogging } from '../TealiumLogging/Link'

type ContactSupportLinkProps = {
    alternateText?: string
   className?: string
}

export const ContactSupportLink = ({
    alternateText,
    className
}: ContactSupportLinkProps): React.ReactElement => {
    const stringConstants = useStringConstants()
    const displayText = alternateText?? 'email the help desk'
    return (
        <LinkWithLogging
        className={className}
        variant="unstyled"
        href={stringConstants.MAIL_TO_SUPPORT_HREF}
        target="_blank"
        rel="noreferrer"
    >
       {displayText}
    </LinkWithLogging>
    )
}
