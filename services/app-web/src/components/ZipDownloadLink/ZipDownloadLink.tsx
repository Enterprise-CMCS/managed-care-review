import React from 'react'
import { InlineDocumentWarning } from '../DocumentWarning'
import { DownloadLink } from '../DownloadLink/DownloadLink'
import { useApolloClient } from '@apollo/client/react'
import { renewZipDownload } from '../../helpers/renewZipDownload'
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
    const client = useApolloClient()
    const zipPackage = documentZipPackages?.find(
        (pkg) =>
            pkg.documentType ===
            (type === 'CONTRACT' ? 'CONTRACT_DOCUMENTS' : 'RATE_DOCUMENTS')
    )
    const contractOrRate = type === 'CONTRACT' ? 'contract' : 'rate'
    const zippedFilesURL =
        type === 'CONTRACT'
            ? getContractZipDownloadUrl(documentZipPackages)
            : getRateZipDownloadUrl(documentZipPackages)

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
        <DownloadLink
            href={zippedFilesURL}
            resourceKey={`zip:${zipPackage!.id}`}
            renew={() => renewZipDownload(client, zipPackage!.id)}
            target="_blank"
            className={styles.downloadLink}
        >
            <span data-testid="zipDownloadLink">
                <Icon.FileDownload className={styles.downloadIcon} />
                Download {`${contractOrRate}`} documents{' '}
                {documentCount &&
                    `(${documentCount} file${documentCount > 1 ? 's' : ''})`}
            </span>
        </DownloadLink>
    )
}
