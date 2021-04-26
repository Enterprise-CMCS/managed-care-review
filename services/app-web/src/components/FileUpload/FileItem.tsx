import React from 'react'
import { Button } from '@trussworks/react-uswds'
import classnames from 'classnames'
import { SPACER_GIF } from './constants'

export type FileStatus =
    | 'PENDING'
    | 'UPLOAD_COMPLETE'
    | 'UPLOAD_ERROR'
    | 'SAVED_TO_SUBMISSION'

export type FileItemT = {
    id: string
    name: string
    url?: string // only items uploaded to s3 have this
    key?: string // only items uploaded to s3 have this
    status: FileStatus
}

export type FileItemProps = {
    item: FileItemT
    deleteItem: (id: string) => void
}
export const FileItem = ({
    item,
    deleteItem,
}: FileItemProps): React.ReactElement => {
    const { name, status } = item
    const isPDF = name.indexOf('.pdf') > 0
    const isWord = name.indexOf('.doc') > 0 || name.indexOf('.pages') > 0
    const isVideo = name.indexOf('.mov') > 0 || name.indexOf('.mp4') > 0
    const isExcel = name.indexOf('.xls') > 0 || name.indexOf('.numbers') > 0
    const isGeneric = !isPDF && !isWord && !isVideo && !isExcel

    const imageClasses = classnames('usa-file-input__preview-image', {
        'is-loading': status === 'PENDING',
        'usa-file-input__preview-image--pdf': isPDF,
        'usa-file-input__preview-image--word': isWord,
        'usa-file-input__preview-image--video': isVideo,
        'usa-file-input__preview-image--excel': isExcel,
        'usa-file-input__preview-image--generic': isGeneric,
    })

    const handleDelete = (e: React.MouseEvent) => {
        deleteItem(item.id)
    }
    return (
        <>
            <div>
                <img
                    id={item.id}
                    data-testid="file-input-preview-image"
                    src={SPACER_GIF}
                    alt=""
                    className={imageClasses}
                />
                <span style={{ padding: '5px', marginRight: '5px' }}>
                    {name}
                </span>
            </div>
            <Button type="button" size="small" unstyled onClick={handleDelete}>
                Delete
            </Button>
        </>
    )
}
