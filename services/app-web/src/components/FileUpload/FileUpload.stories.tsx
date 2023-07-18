//Changed import from component/index.ts to fix Cannot access before initialization error on multiple stories when upgrading to storybook 6.5.4 as a part of react-router v6 upgrade
import { FileUpload, S3FileData } from '../index'
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
            renderMode="list"
            uploadFile={(file: File) =>
                fakeRequest<S3FileData>(true, resolveData)
            }
            scanFile={async (key: string) => {
                await fakeRequest<S3FileData>(true, resolveData)
                return
            }}
            deleteFile={async (key: string) => {
                await fakeRequest<S3FileData>(true, resolveData)
                return
            }}
            onFileItemsUpdate={() => console.info('Async load complete')}
            isContractOnly={false}
        />
    )
}

export const DemoTableUploadSuccess = (): React.ReactElement => {
    return (
        <FileUpload
            id="Default"
            name="Default Input"
            label="FileInput"
            renderMode="table"
            uploadFile={(file: File) =>
                fakeRequest<S3FileData>(true, resolveData)
            }
            scanFile={async (key: string) => {
                await fakeRequest<S3FileData>(true, resolveData)
                return
            }}
            deleteFile={async (key: string) => {
                await fakeRequest<S3FileData>(true, resolveData)
                return
            }}
            onFileItemsUpdate={() => console.info('Async load complete')}
            isContractOnly={false}
        />
    )
}

export const DemoListUploadFailure = (): React.ReactElement => {
    return (
        <FileUpload
            id="Default"
            name="Default Input"
            label="FileInput"
            renderMode="list"
            uploadFile={(file: File) =>
                fakeRequest<S3FileData>(false, resolveData)
            }
            scanFile={async (key: string) => {
                await fakeRequest<S3FileData>(true, resolveData)
                return
            }}
            deleteFile={async (key: string) => {
                await fakeRequest<S3FileData>(true, resolveData)
                return
            }}
            onFileItemsUpdate={() => console.info('Async load complete')}
            isContractOnly={false}
        />
    )
}

export const DemoTableUploadFailure = (): React.ReactElement => {
    return (
        <FileUpload
            id="Default"
            name="Default Input"
            label="FileInput"
            renderMode="table"
            uploadFile={(file: File) =>
                fakeRequest<S3FileData>(false, resolveData)
            }
            scanFile={async (key: string) => {
                await fakeRequest<S3FileData>(true, resolveData)
                return
            }}
            deleteFile={async (key: string) => {
                await fakeRequest<S3FileData>(true, resolveData)
                return
            }}
            onFileItemsUpdate={() => console.info('Async load complete')}
            isContractOnly={false}
        />
    )
}

export const DemoListScanFailure = (): React.ReactElement => {
    return (
        <FileUpload
            id="Default"
            name="Default Input"
            label="FileInput"
            renderMode="list"
            uploadFile={(file: File) =>
                fakeRequest<S3FileData>(true, resolveData)
            }
            scanFile={async (key: string) => {
                await fakeRequest<S3FileData>(false, resolveData)
                return
            }}
            deleteFile={async (key: string) => {
                await fakeRequest<S3FileData>(true, resolveData)
                return
            }}
            onFileItemsUpdate={() => console.info('Async load complete')}
            isContractOnly={false}
        />
    )
}

export const DemoTableScanFailure = (): React.ReactElement => {
    return (
        <FileUpload
            id="Default"
            name="Default Input"
            label="FileInput"
            renderMode="table"
            uploadFile={(file: File) =>
                fakeRequest<S3FileData>(true, resolveData)
            }
            scanFile={async (key: string) => {
                await fakeRequest<S3FileData>(false, resolveData)
                return
            }}
            deleteFile={async (key: string) => {
                await fakeRequest<S3FileData>(true, resolveData)
                return
            }}
            onFileItemsUpdate={() => console.info('Async load complete')}
            isContractOnly={false}
        />
    )
}
