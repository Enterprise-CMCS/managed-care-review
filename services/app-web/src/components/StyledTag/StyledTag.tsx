import React, { ComponentProps } from 'react'
import { Tag } from '@trussworks/react-uswds'
import classNames from 'classnames'

import styles from './StyledTag.module.scss'

/* 
Main application-wide tag. 
  This is a react-uswds Tag enhanced with CMS styles.
*/
export type StyledTagProps = {
    color: 'green' | 'yellow' | 'blue'
} & ComponentProps<typeof Tag>

export const StyledTag = ({
    color,
    className,
    children,
}: StyledTagProps): React.ReactElement | null => {
    const tagClasses = classNames(
        'usa-tag',
        {
            [styles['green-tag']]: color === 'green',
            [styles['blue-tag']]: color === 'blue',
            [styles['yellow-tag']]: color === 'yellow',
        },

        className
    )
    return (
        <>
            <Tag className={tagClasses}>{children}</Tag>
        </>
    )
}
