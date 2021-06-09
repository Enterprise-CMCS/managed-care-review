import React from 'react'
import { Link, ButtonGroup, Button } from '@trussworks/react-uswds'

import styles from './ReviewSubmit/ReviewSubmit.module.scss'
import classNames from 'classnames'

export type PageActionsProps = {
    secondaryAction: string
    primaryAction: string
    primaryActionCallback: (e: React.FormEvent) => Promise<void>
}

export const PageActions = ({
    secondaryAction,
    primaryAction,
    primaryActionCallback,
}: PageActionsProps): React.ReactElement => {
    const submitButtonClasses = classNames('usa-button', styles.submitButton)
    return (
        <div className={styles.pageActions}>
            <Link href="#">Save as draft</Link>
            <ButtonGroup type="default" className={styles.buttonGroup}>
                <Link
                    variant="unstyled"
                    href="#"
                    className="usa-button usa-button--outline"
                >
                    {secondaryAction}
                </Link>
                <Button
                    type="button"
                    className={submitButtonClasses}
                    onClick={primaryActionCallback}
                >
                    {primaryAction}
                </Button>
            </ButtonGroup>
        </div>
    )
}
