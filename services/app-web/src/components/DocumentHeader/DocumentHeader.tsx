import {
    ZipDownloadLink,
    ZipDownloadLinkProps,
} from '../ZipDownloadLink/ZipDownloadLink'
import styles from './DocumentHeader.module.scss'

interface DocumentHeaderProps extends ZipDownloadLinkProps {
    renderZipLink?: boolean
}

export const DocumentHeader = ({
    renderZipLink,
    ...zipLinkProps
}: DocumentHeaderProps): React.ReactElement => {
    return (
        <div className={styles.documentHeaderContainer}>
            <h4 className={styles.header}>
                {zipLinkProps.type === 'RATE' ? 'Rate' : 'Contract'} documents
            </h4>
            {renderZipLink && <ZipDownloadLink {...zipLinkProps} />}
        </div>
    )
}
