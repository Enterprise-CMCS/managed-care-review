import { SectionHeader } from '../SectionHeader'
import {
    ZipDownloadLink,
    ZipDownloadLinkProps,
} from '../ZipDownloadLink/ZipDownloadLink'
import styles from './DocumentHeader.module.scss'

interface DocumentHeaderProps extends ZipDownloadLinkProps {
    renderZipLink?: boolean
    removeTopBorder?: boolean
}

export const DocumentHeader = ({
    renderZipLink,
    removeTopBorder,
    ...zipLinkProps
}: DocumentHeaderProps): React.ReactElement => {
    return (
        <div
            className={`${styles.documentHeaderContainer} ${removeTopBorder ? styles.removeTopBorder : ''}`}
        >
            <SectionHeader
                header={`${zipLinkProps.type === 'RATE' ? 'Rate' : 'Contract'} documents`}
                hideBorderTop
                hideBorderBottom
                headingLevel="h3"
            />
            {renderZipLink && <ZipDownloadLink {...zipLinkProps} />}
        </div>
    )
}
