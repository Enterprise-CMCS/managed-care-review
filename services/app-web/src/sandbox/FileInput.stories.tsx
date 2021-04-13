import React from 'react'
import { FileInput } from './FileInput'

export default {
    title: 'Sandbox/FileInput',
    component: FileInput,
}
const uploadFiles = (success: boolean, timeout?: number): Promise<void> => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (success) {
                resolve()
            } else {
                reject(new Error('Error'))
            }
        }, timeout || 4000)
    })
}

const deleteFiles = (success: boolean, timeout?: number): Promise<void> => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (success) {
                resolve()
            } else {
                reject(new Error('Error'))
            }
        }, timeout || 1000)
    })
}
export const Default = (): React.ReactElement => (
    <FileInput id="Default" name="Default Input" uploadFilesApi={uploadFiles} />
)
