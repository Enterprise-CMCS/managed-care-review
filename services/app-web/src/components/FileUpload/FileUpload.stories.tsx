import { FileUpload, S3FileData } from './FileUpload'

export default {
    title: 'Components/Forms/FileUpload',
    component: FileUpload,
}
const fakeApiRequest = (success: boolean): Promise<S3FileData> => {
    const timeout = Math.round(Math.random() * 4000 + 1000)
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (success) {
                resolve({ key: 'testtest', s3URL: 'fakeS3url' })
            } else {
                reject(new Error('Error'))
            }
        }, timeout)
    })
}

export const DemoFileUploadSuccess = (): React.ReactElement => {
    return (
        <FileUpload
            id="Default"
            name="Default Input"
            label="FileInput"
            uploadFile={(file: File) => fakeApiRequest(true)}
            deleteFile={async (key: string) => {
                await fakeApiRequest(true)
                return
            }}
            onLoadComplete={() => console.log('Async load complete')}
            onInvalidDrop={() => console.log('Async on invalid drop')}
        />
    )
}

export const DemoFileUploadFailure = (): React.ReactElement => {
    return (
        <FileUpload
            id="Default"
            name="Default Input"
            label="FileInput"
            uploadFile={(file: File) => fakeApiRequest(false)}
            deleteFile={async (key: string) => {
                await fakeApiRequest(true)
                return
            }}
            onLoadComplete={() => console.log('Async load complete')}
            onInvalidDrop={() => console.log('Async on invalid drop')}
        />
    )
}
