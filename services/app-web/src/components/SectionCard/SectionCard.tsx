import classNames from 'classnames'
import styles from './SectionCard.module.scss'
import React from 'react'

/*
    HTML section with card styling.
    This type of section area stands out visually from the rest of the content.
*/
type SectionCardProps = {
    children: React.ReactNode
} & React.JSX.IntrinsicElements['section']

const SectionCard = ({
    children,
    className,
    ...restProps
}: SectionCardProps) => {
    const classes = classNames(styles.section, className)
    return (
        <section className={classes} {...restProps}>
            {children}
        </section>
    )
}

export { SectionCard }
