import React from 'react'
import { InlineDocumentWarning } from '../DocumentWarning'
import { LinkWithLogging } from '../../components'
import { Icon } from '@trussworks/react-uswds'
import {
    getContractZipDownloadUrl,
    getRateZipDownloadUrl,
} from '../../helpers/zipHelpers'
import { DocumentZipPackage } from '../../gen/gqlClient'
import styles from './ZipDownloadLink.module.scss'

export type ZipDownloadLinkProps = {
    type: 'CONTRACT' | 'RATE' | 'SINGLE-RATE'
    documentZipPackages: DocumentZipPackage[] | undefined
    documentCount: number | undefined
    onDocumentError?: (error: true) => void
}

export const ZipDownloadLink = ({
    type,
    documentZipPackages,
    documentCount,
    onDocumentError,
}: ZipDownloadLinkProps): React.ReactElement => {
    const contractOrRate = type === 'CONTRACT' ? 'contract' : 'rate'
    const zippedFilesURL =
        type === 'CONTRACT'
            ? getContractZipDownloadUrl(documentZipPackages)
            : getRateZipDownloadUrl(documentZipPackages)
    const className = (type: string) => {
        switch (type) {
            case 'CONTRACT':
                return styles.contract
            case 'RATE':
                return styles.rate
            case 'SINGLE-RATE':
                return styles.singleRate
        }
    }
    if (!zippedFilesURL) {
        if (onDocumentError) {
            onDocumentError(true)
        }
        return (
            <InlineDocumentWarning
                message={`${type === 'CONTRACT' ? 'Contract' : 'Rate'} document download is unavailable`}
            />
        )
    }

    return (
        <LinkWithLogging
            variant="unstyled"
            href={zippedFilesURL}
            target="_blank"
        >
            <p className={className(type)} data-testid="zipDownloadLink">
                <Icon.FileDownload className={styles.downloadIcon} />
                Download {`${contractOrRate}`} documents{' '}
                {documentCount &&
                    `(${documentCount} file${documentCount > 1 ? 's' : ''})`}
            </p>
        </LinkWithLogging>
    )
}
