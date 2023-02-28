import { useEffect, useState } from 'react'
import { FileItemT } from '../components'

// Intended for use with FileUpload component
const useFileUpload = (shouldValidate = false) => {
    const [fileItems, setFileItems] = useState<FileItemT[]>([])
    const [hasValidFiles, setHasValidFiles] = useState(false)
    const [hasLoadingFiles, setHasLoadingFiles] = useState(false)
    const hasNoFiles = fileItems.length === 0

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
    useEffect(() => {
        const allFilesComplete = fileItems.every(
            (item) => item.status === 'UPLOAD_COMPLETE'
        )
        setHasValidFiles(allFilesComplete)

        if (!allFilesComplete) {
            const updatedLoading = fileItems.some(
                (item) =>
                    item.status === 'PENDING' || item.status === 'SCANNING'
            )
            setHasLoadingFiles(updatedLoading)
        }
    }, [fileItems])

    let fileUploadErrorMessage = undefined

    if (shouldValidate) {
        if (hasLoadingFiles) {
            fileUploadErrorMessage =
                'You must wait for all documents to finish uploading before continuing'
        } else if (fileItems.length === 0) {
            fileUploadErrorMessage = 'You must upload at least one document'
        } else if (!hasValidFiles) {
            fileUploadErrorMessage =
                'You must remove all documents with error messages before continuing'
        }
    }

    // This is a safeguard. In case something goes wrong with managing the state of file items (see FileUpload component for that logic) we surface a function to double check everything, filter out bad states, and log errors
    // Can be used right before we transform React-based "file items" to database friendly documents
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
        fileUploadErrorMessage,
        cleanFileItemsBeforeSave,
    }
}

export { useFileUpload }
