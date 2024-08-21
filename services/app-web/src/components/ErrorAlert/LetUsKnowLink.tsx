import React from 'react'
import { useStringConstants } from '../../hooks/useStringConstants'
import { LinkWithLogging } from '../TealiumLogging/Link'

type LetUsKnowLinkProps = {
    alternateText?: string
   className?: string
}

export const LetUsKnowLink = ({
    alternateText,
    className
}: LetUsKnowLinkProps): React.ReactElement => {
    const stringConstants = useStringConstants()
    const displayText = alternateText?? 'let us know'
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
