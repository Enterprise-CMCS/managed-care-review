import React from 'react'
import { ButtonGroup } from '@trussworks/react-uswds'
import styles from '../StateSubmissionForm.module.scss'

/* Wrapper for <PageActions />
    In most cases this UI will be used through the main PageActions component. However, surfacing the wrapper so its possible to pass in custom elements and combinations.
    The "main children" are elements that appear in a right aligned uswds button flexbox. 
    A left element may also optionally be passed in.
*/
type PageActionsContainerProps = {
    left?: React.ReactNode
    children: React.ReactNode | React.ReactNode[]
}

export const PageActionsContainer = (
    props: PageActionsContainerProps
): React.ReactElement => {
    const { left, children } = props

    const mainChildren = Array.isArray(children) ? (
        <ButtonGroup type="default" className={styles.buttonGroup}>
            {children}
        </ButtonGroup>
    ) : (
        children
    )
    return (
        <div className={styles.pageActions}>
            {left && left}
            {mainChildren}
        </div>
    )
}
