import React from 'react'
import { StyledTag } from '../../StyledTag/StyledTag'
import styles from './UploadedDocumentsTable.module.scss'

type DocumentTagProps = {
    isShared?: boolean
    isNew?: boolean
}
export const DocumentTag = ({
    isShared = false,
    isNew = false,
}: DocumentTagProps): React.ReactElement | null => {
    if (!isShared && !isNew) return null

    return (
        <>
            {isNew ? (
                <StyledTag className={styles.inlineTag} color="blue">
                    NEW
                </StyledTag>
            ) : null}
            {isShared ? (
                <StyledTag className={styles.inlineTag} color="yellow">
                    SHARED
                </StyledTag>
            ) : null}
        </>
    )
}
