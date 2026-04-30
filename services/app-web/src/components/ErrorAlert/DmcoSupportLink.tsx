import React from 'react'
import { useStringConstants } from '../../hooks/useStringConstants'
import { LinkWithLogging } from '../TealiumLogging/Link'

const DMCO_SUPPORT_EMAIL = 'MCGDMCOactions@cms.hhs.gov'

type DmcoSupportLinkProps = {
    alternateText?: string
    className?: string
    variant?: 'nav' | 'unstyled' | 'external'
}

export const DmcoSupportLink = ({
    alternateText,
    className,
    variant = 'unstyled',
}: DmcoSupportLinkProps): React.ReactElement => {
    const stringConstants = useStringConstants()
    const displayText = alternateText ?? DMCO_SUPPORT_EMAIL

    return (
        <LinkWithLogging
            className={className}
            variant={variant}
            href={stringConstants.MAIL_TO_DMCO_SUPPORT_HREF}
            target="_blank"
            rel="noreferrer"
        >
            {displayText}
        </LinkWithLogging>
    )
}
