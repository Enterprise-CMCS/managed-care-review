import React from 'react'
import { InfoTag } from '../../InfoTag/InfoTag'
import styles from './UploadedDocumentsTable.module.scss'

type DocumentTagProps = {
    isShared?: boolean // can be deleted after legacy submissions addressed and LINK_RATES permanently on
    isNew?: boolean
}
export const DocumentTag = ({
    isShared = false,
    isNew = false,
}: DocumentTagProps): React.ReactElement | null => {
    if (!isShared && !isNew) return null

    return (
        <span className={styles.docTagContainer} data-testid="info-tag">
            {isNew ? (
                <InfoTag className={styles.inlineTag} color="cyan">
                    NEW
                </InfoTag>
            ) : null}
            {isShared ? (
                <InfoTag className={styles.inlineTag} color="gold">
                    SHARED
                </InfoTag>
            ) : null}
        </span>
    )
}
