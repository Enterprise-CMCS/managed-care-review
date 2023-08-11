import { FileItemT } from './FileProcessor/FileProcessor'

const hasNoLoadingFiles = (fileItems: FileItemT[]) =>
    fileItems.every(
        (item) => item.status !== 'PENDING' && item.status !== 'SCANNING'
    )

const hasNoFileErrors = (fileItems: FileItemT[]) => {
    return fileItems.every(
        (item) =>
            item.status !== 'DUPLICATE_NAME_ERROR' &&
            item.status !== 'UPLOAD_ERROR' &&
            item.status !== 'SCANNING_ERROR'
    )
}

const hasAtLeastOneFile = (fileItems: FileItemT[]) => fileItems.length > 0

// Used to prevent save as draft when documents are partially loaded or have file errors
const isLoadingOrHasFileErrors = (fileItems: FileItemT[]) => {
    return !hasNoLoadingFiles(fileItems) || !hasNoFileErrors(fileItems)
}

// Transform React-based "file items" to database friendly documents
// Use of this function is a safeguard. We double check everything, filter out bad states, and log errors before sending to API
const cleanFileItemsBeforeSave = (fileItems: FileItemT[]) => {
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

export {
    hasNoLoadingFiles,
    hasNoFileErrors,
    hasAtLeastOneFile,
    isLoadingOrHasFileErrors,
    cleanFileItemsBeforeSave,
}
