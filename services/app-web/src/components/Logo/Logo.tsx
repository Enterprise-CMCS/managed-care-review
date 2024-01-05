import React from 'react'
import classNames from 'classnames'
import styles from './Logo.module.scss'
/**
 * Wrap logo pngs in image tag and uswds classes
 */
export const Logo = ({
    alt,
    src,
    className,
    ...props
}: JSX.IntrinsicElements['img']): React.ReactElement => {
    const logoClasses = classNames(
        'usa-logo', // uswds default classses
        styles.override, // override uswds vertical spacing
        className // apply any custom classes
    )
    return (
        <div className={logoClasses}>
            <img alt={alt} src={src} {...props} />
        </div>
    )
}
