import React, { ComponentProps } from 'react'
import { Link } from '@trussworks/react-uswds'
import { Spinner } from '../Spinner'
import styles from '../ActionButton/ActionButton.module.scss'
import classnames from 'classnames'

type DownloadButtonProps = {
    text: string
    zippedFilesURL: string | undefined
} & Partial<ComponentProps<typeof Link>>

export const DownloadButton = ({
    text,
    zippedFilesURL,
}: DownloadButtonProps): React.ReactElement => {
    const classes = classnames(
        {
            'usa-button--active': !zippedFilesURL,
            [styles.disabledCursor]: !zippedFilesURL,
        },
        'usa-button usa-button'
    )

    return (
        <div>
            {zippedFilesURL ? (
                <Link
                    className={classes}
                    variant="unstyled"
                    href={zippedFilesURL}
                    target="_blank"
                >
                    <span className={styles.buttonTextWithoutIcon}>{text}</span>
                </Link>
            ) : (
                <div className={classes} aria-label="Loading">
                    <Spinner size="small" />
                    <span className={styles.buttonTextWithIcon}>Loading</span>
                </div>
            )}
        </div>
    )
}
