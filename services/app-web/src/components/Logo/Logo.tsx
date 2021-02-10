import React from 'react'

/**
 * Wrap logo pngs in image tag and uswds classes
 */
export const Logo = ({
    alt,
    src,
    ...props
}: JSX.IntrinsicElements['img']): React.ReactElement => {
    return (
        <div className="usa-logo">
            <img alt={alt} src={src} {...props} />
        </div>
    )
}
