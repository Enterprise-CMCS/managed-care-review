import { FileUpload, S3FileData } from './FileUpload'

function fakeRequest<T>(
    success: boolean,
    returnData: T,
    timeout?: number
): Promise<T> {
    const t = timeout || Math.round(Math.random() * 1000)
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (success) {
                resolve(returnData)
            } else {
                reject(new Error('Error'))
            }
        }, t)
    })
}

export default {
    title: 'Components/Forms/FileUpload',
    component: FileUpload,
}
const resolveData = { key: 'testtest', s3URL: 's3://bucketname/key/fakeS3url' }

export const DemoListUploadSuccess = (): React.ReactElement => {
    return (
        <FileUpload
            id="Default"
            name="Default Input"
            label="FileInput"
            uploadFile={(_file: File) =>
                fakeRequest<S3FileData>(true, resolveData)
            }
            scanFile={async (_key: string) => {
                await fakeRequest<S3FileData>(true, resolveData)
                return
            }}
            onFileItemsUpdate={() => console.info('Async load complete')}
        />
    )
}

export const DemoTableUploadSuccess = (): React.ReactElement => {
    return (
        <FileUpload
            id="Default"
            name="Default Input"
            label="FileInput"
            uploadFile={(_file: File) =>
                fakeRequest<S3FileData>(true, resolveData)
            }
            scanFile={async (_key: string) => {
                await fakeRequest<S3FileData>(true, resolveData)
                return
            }}
            onFileItemsUpdate={() => console.info('Async load complete')}
        />
    )
}

export const DemoListUploadFailure = (): React.ReactElement => {
    return (
        <FileUpload
            id="Default"
            name="Default Input"
            label="FileInput"
            uploadFile={(_file: File) =>
                fakeRequest<S3FileData>(false, resolveData)
            }
            scanFile={async (_key: string) => {
                await fakeRequest<S3FileData>(true, resolveData)
                return
            }}
            onFileItemsUpdate={() => console.info('Async load complete')}
        />
    )
}

export const DemoTableUploadFailure = (): React.ReactElement => {
    return (
        <FileUpload
            id="Default"
            name="Default Input"
            label="FileInput"
            uploadFile={(_file: File) =>
                fakeRequest<S3FileData>(false, resolveData)
            }
            scanFile={async (_key: string) => {
                await fakeRequest<S3FileData>(true, resolveData)
                return
            }}
            onFileItemsUpdate={() => console.info('Async load complete')}
        />
    )
}

export const DemoListScanFailure = (): React.ReactElement => {
    return (
        <FileUpload
            id="Default"
            name="Default Input"
            label="FileInput"
            uploadFile={(_file: File) =>
                fakeRequest<S3FileData>(true, resolveData)
            }
            scanFile={async (_key: string) => {
                await fakeRequest<S3FileData>(false, resolveData)
                return
            }}
            onFileItemsUpdate={() => console.info('Async load complete')}
        />
    )
}

export const DemoTableScanFailure = (): React.ReactElement => {
    return (
        <FileUpload
            id="Default"
            name="Default Input"
            label="FileInput"
            uploadFile={(_file: File) =>
                fakeRequest<S3FileData>(true, resolveData)
            }
            scanFile={async (_key: string) => {
                await fakeRequest<S3FileData>(false, resolveData)
                return
            }}
            onFileItemsUpdate={() => console.info('Async load complete')}
        />
    )
}
