import React from 'react'
import { useStringConstants } from '../../hooks/useStringConstants'
import { LinkWithLogging } from '../TealiumLogging/Link'

type ContactSupportLinkProps = {
    alternateText?: string
    className?: string
    variant?: 'nav' | 'unstyled' | 'external'
}

export const ContactSupportLink = ({
    alternateText,
    className,
    variant = 'unstyled',
}: ContactSupportLinkProps): React.ReactElement => {
    const stringConstants = useStringConstants()
    const displayText = alternateText ?? 'email the help desk'
    return (
        <LinkWithLogging
            className={className}
            variant={variant}
            href={stringConstants.MAIL_TO_SUPPORT_HREF}
            target="_blank"
            rel="noreferrer"
        >
            {displayText}
        </LinkWithLogging>
    )
}
