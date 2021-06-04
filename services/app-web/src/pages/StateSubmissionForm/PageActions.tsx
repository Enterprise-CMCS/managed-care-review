import React from 'react'
import { Link, ButtonGroup, Button } from '@trussworks/react-uswds'

import styles from './ReviewSubmit/ReviewSubmit.module.scss'

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
                    className={styles.submitButton}
                    onClick={primaryActionCallback}
                >
                    {primaryAction}
                </Button>
            </ButtonGroup>
        </div>
    )
}
