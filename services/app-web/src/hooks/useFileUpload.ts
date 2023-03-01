import { useState } from 'react'
import { FileItemT } from '../components'

// Intended for use with FileUpload component
const useFileUpload = (shouldValidate = false) => {
    const [fileItems, setFileItems] = useState<FileItemT[]>([])
    const hasNoFiles = fileItems.length === 0
    const hasValidFiles = fileItems.every(
        (item) => item.status === 'UPLOAD_COMPLETE'
    )
    const hasLoadingFiles = fileItems.some(
        (item) => item.status === 'PENDING' || item.status === 'SCANNING'
    )

    // Handle file items update
    // This is surfaced to consumers instead of setFileItems to ensures we avoid unnecessary updates. This is a "functional update" in React language
    const onFileItemsUpdate = async ({
        fileItems,
    }: {
        fileItems: FileItemT[]
    }) => {
        setFileItems((prevValue) =>
            fileItems.length !== prevValue.length ||
            !prevValue.every((el) => fileItems.includes(el))
                ? fileItems
                : prevValue
        )
    }

    // Calculate error messages
    let fileUploadError = undefined

    if (hasLoadingFiles) {
        fileUploadError =
            'You must wait for all documents to finish uploading before continuing'
    } else if (hasNoFiles) {
        fileUploadError = 'You must upload at least one document'
    } else if (!hasValidFiles) {
        fileUploadError =
            'You must remove all documents with error messages before continuing'
    }

    // Transform React-based "file items" to database friendly documents
    // Use of this function is a safeguard. We double check everything, filter out bad states, and log errors before sending to API
    const cleanFileItemsBeforeSave = () => {
        return fileItems.reduce((cleanedFileItems, fileItem) => {
            if (fileItem.status === 'UPLOAD_ERROR') {
                console.info(
                    'Attempting to save files that failed upload, discarding invalid files'
                )
            } else if (fileItem.status === 'SCANNING_ERROR') {
                console.info(
                    'Attempting to save files that failed scanning, discarding invalid files'
                )
            } else if (fileItem.status === 'DUPLICATE_NAME_ERROR') {
                console.info(
                    'Attempting to save files that are duplicate names, discarding duplicate'
                )
            } else if (!fileItem.s3URL)
                console.info(
                    'Attempting to save a seemingly valid file item is not yet uploaded to S3, this should not happen on form submit. Discarding file.'
                )
            else {
                cleanedFileItems.push(fileItem)
            }
            return cleanedFileItems
        }, [] as FileItemT[])
    }

    return {
        hasNoFiles,
        hasValidFiles,
        hasLoadingFiles,
        fileItems,
        onFileItemsUpdate,
        fileUploadError,
        cleanFileItemsBeforeSave,
    }
}

export { useFileUpload }
