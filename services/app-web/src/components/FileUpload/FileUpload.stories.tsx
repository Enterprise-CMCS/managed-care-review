import { FileUpload, S3FileData } from './FileUpload'
import { fakeRequest } from '../../testHelpers/jestHelpers'

export default {
    title: 'Components/Forms/FileUpload',
    component: FileUpload,
}
const resolveData = { key: 'testtest', s3URL: 'fakeS3url' }

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
            deleteFile={async (_key: string) => {
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
            deleteFile={async (_key: string) => {
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
            deleteFile={async (_key: string) => {
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
            deleteFile={async (_key: string) => {
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
            deleteFile={async (_key: string) => {
                await fakeRequest<S3FileData>(true, resolveData)
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
            deleteFile={async (_key: string) => {
                await fakeRequest<S3FileData>(true, resolveData)
                return
            }}
            onFileItemsUpdate={() => console.info('Async load complete')}
        />
    )
}
