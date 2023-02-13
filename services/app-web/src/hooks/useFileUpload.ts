import { useEffect, useState } from "react"
import { FileItemT } from "../components"

// Intended for use with FileUpload component 
const useFileUpload = () => {
    const [fileItems, setFileItems] = useState<FileItemT[]>([])
    const [hasValidFiles, setHasValidFiles] = useState(false)
    const [hasLoadingFiles, setHasLoadingFiles] = useState(false)

    const onFileItemsUpdate = async ({
        fileItems,
    }: {
        fileItems: FileItemT[]
    }) => {
        setFileItems(fileItems)
    }
    useEffect( () => {
        console.log('in file update effect')
           setHasValidFiles((prevValue) => { 
                const updatedHasValidFiles = fileItems.every(
                    (item) => item.status === 'UPLOAD_COMPLETE'
                )
                    return prevValue === updatedHasValidFiles ? prevValue : updatedHasValidFiles
            })

           setHasLoadingFiles((prevValue) => {
               const updatedLoading =
                   fileItems.some((item) => item.status === 'PENDING') ||
                   fileItems.some((item) => item.status === 'SCANNING')

               return prevValue === updatedLoading ? prevValue : updatedLoading
           })

    }, [fileItems])


    return { hasValidFiles, hasLoadingFiles, setFileItems, fileItems, onFileItemsUpdate}

}


export {useFileUpload}
