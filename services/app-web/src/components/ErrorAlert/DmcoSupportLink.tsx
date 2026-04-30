import React from 'react'
import { LinkWithLogging } from '../TealiumLogging/Link'

const DMCO_SUPPORT_EMAIL = 'MCGDMCOactions@cms.hhs.gov'
const DMCO_SUPPORT_HREF = `mailto:${DMCO_SUPPORT_EMAIL}`

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
    const displayText = alternateText ?? DMCO_SUPPORT_EMAIL

    return (
        <LinkWithLogging
            className={className}
            variant={variant}
            href={DMCO_SUPPORT_HREF}
            target="_blank"
            rel="noreferrer"
        >
            {displayText}
        </LinkWithLogging>
    )
}
