import {
    ZipDownloadLink,
    ZipDownloadLinkProps,
} from '../ZipDownloadLink/ZipDownloadLink'
import styles from './DocumentHeader.module.scss'

interface DocumentHeaderProps extends ZipDownloadLinkProps {
    renderZipLink?: boolean
    removeTopBorder?: boolean
    removeBottomBorder?: boolean
    headingLevel?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
}

export const DocumentHeader = ({
    renderZipLink,
    removeTopBorder,
    headingLevel = 'h4',
    ...zipLinkProps
}: DocumentHeaderProps): React.ReactElement => {
    const Heading = headingLevel

    return (
        <div
            className={`${styles.documentHeaderContainer} ${removeTopBorder ? styles.removeTopBorder : ''}`}
        >
            <Heading className={styles.header}>
                {zipLinkProps.type === 'RATE' ? 'Rate' : 'Contract'} documents
            </Heading>
            {renderZipLink && <ZipDownloadLink {...zipLinkProps} />}
        </div>
    )
}
