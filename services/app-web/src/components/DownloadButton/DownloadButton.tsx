import React, { ComponentProps } from 'react'
import { LinkWithLogging } from '../TealiumLogging/Link'
import { Spinner } from '../Spinner'
import styles from './DownloadButton.module.scss'
import classnames from 'classnames'

type DownloadButtonProps = {
    text: string
    zippedFilesURL: string | undefined
} & Partial<ComponentProps<typeof LinkWithLogging>>

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
                <LinkWithLogging
                    className={classes}
                    variant="unstyled"
                    href={zippedFilesURL}
                    target="_blank"
                >
                    <span className={styles.buttonTextWithoutIcon}>{text}</span>
                </LinkWithLogging>
            ) : (
                <div className={classes} aria-label="Loading">
                    <Spinner size="small" />
                    <span className={styles.buttonTextWithIcon}>Loading</span>
                </div>
            )}
        </div>
    )
}
