import React, { useState, useRef } from 'react'
import { GridContainer } from '@trussworks/react-uswds'
import PageHeading from '../../../components/PageHeading'
import {
    ErrorMessage,
    FormGroup,
    Label,
    FileInput,
} from '@trussworks/react-uswds'
import { FileItemT } from '../../../sandbox/FileItem'
import { FileItemsList } from '../../../sandbox/FileItemsList'

type DocumentUploadProps = {
    id: string
    name: string
    // TODO: Refine types for real api calls
    uploadS3Files: () => Promise<void>
    deleteS3Files: () => Promise<void>
    onLoadComplete: ({ files }: { files: FileItemT[] }) => void
}

/* 
    Document Upload. Handles async upload of document files to S3 and displaying in line errors. 

    TODO: Refactor asyncS3Upload to use Promise.all
    TODO: Disallow file upload of the same name
    TODO: Disallow files that are not doc file type
    TODO: Implement inline error handling (when a specific file item fails to upload)
    TODO: Style fix for many items in list or items have long document titles
    TODO: Check thoroughly for accessibility 
*/

export const Documents = ({
    id,
    name,
    uploadS3Files,
    deleteS3Files,
    onLoadComplete,
    ...props
}: DocumentUploadProps): React.ReactElement => {
    const [fieldError, setFieldError] = useState<string | null>(null)
    const [fileItems, setFileItems] = useState<FileItemT[]>([])
    const fileInputRef = useRef<HTMLInputElement>(null) // reference to the overall input
    /*  
        This component rewrites the FileInput key whenever user adds a new file to force re-render. 
        Changing the key ensure we clears the input immediately and display our FileItemList in favor of built-in react-uswds FilePreview list.\
        The key is a React.Key, should be a unique number
    */
    const fileInputKey = useRef(Math.random())

    const generateFileItems = (fileList: FileList) => {
        const fileItems: FileItemT[] = []
        for (let i = 0; i < fileList?.length; i++) {
            fileItems.push({
                id: fileList[i].name,
                name: fileList[i].name,
                url: window.URL.createObjectURL(fileList[i]),
                status: 'PENDING',
            })
        }
        return fileItems
    }

    const deleteItem = (id: string) => {
        setFileItems((prevItems) => prevItems.filter((item) => item.id !== id))
        deleteS3Files().catch(() => console.log('error deleting from s3'))
    }

    const asyncS3Upload = (items: FileItemT[]) => {
        items.forEach((item) => {
            uploadS3Files()
                .then(() => {
                    console.log('uploaded')
                    setFileItems((prevItems) => {
                        const newItems = [...prevItems]
                        return newItems.map((current) => {
                            if (current.id === item.id) {
                                return {
                                    ...item,
                                    status: 'UPLOAD_COMPLETE',
                                } as FileItemT
                            } else {
                                return current
                            }
                        })
                    })
                })
                .catch((e) => {
                    console.log('hello')
                    setFileItems((prevItems) => {
                        const newItems = [...prevItems]
                        return newItems.map((current) => {
                            if (current.id === item.id) {
                                return {
                                    ...item,
                                    status: 'UPLOAD_ERROR',
                                } as FileItemT
                            } else {
                                return current
                            }
                        })
                    })
                    setFieldError(
                        'Some files have failed to upload, please retry.'
                    )
                })
                .finally(() => {
                    console.log('upload complete')
                })
        })
    }

    const handleFileInputChangeOrDrop = (
        e: React.DragEvent | React.ChangeEvent
    ): void => {
        console.log('HANDING CHANGE', e)

        if (!fileInputRef?.current?.files) return
        setFieldError(null)

        console.log('no err', fileInputRef.current)
        console.log('no err', fileInputRef.current.files)

        const items = generateFileItems(fileInputRef.current.files)
        fileInputKey.current = Math.random()
        setFileItems((array) => [...array, ...items])
        asyncS3Upload(items)
    }

    return (
        <GridContainer>
            <PageHeading headingLevel="h2"> Documents </PageHeading>
            <FormGroup>
                <Label htmlFor={id}>Input accepts any kind of document</Label>
                <span className="usa-hint" id={`${id}-hint`}>
                    Select any type of document
                </span>
                {fieldError && (
                    <ErrorMessage id={`${id}-error`}>{fieldError}</ErrorMessage>
                )}
                <FileInput
                    key={fileInputKey.current}
                    id={id}
                    name={name}
                    aria-describedby={`${id}-error ${id}-hint`}
                    multiple
                    onChange={handleFileInputChangeOrDrop}
                    onDrop={handleFileInputChangeOrDrop}
                    inputRef={fileInputRef}
                />
                <FileItemsList deleteItem={deleteItem} fileItems={fileItems} />
            </FormGroup>
        </GridContainer>
    )
}
