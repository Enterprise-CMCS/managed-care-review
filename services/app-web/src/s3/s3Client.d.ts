import { S3Error } from './s3Error'
import { HealthPlanPackageStatusType } from '../common-code/domain-models'
import { FileItemT } from '../components'

export type S3ClientT = {
    uploadFile: (file: File) => Promise<string | S3Error>
    deleteFile: (
        key: string,
        planPackageStatus?: HealthPlanPackageStatusType,
        fileItems?: FileItemT[]
    ) => Promise<void | S3Error>
    scanFile: (key: string) => Promise<void | S3Error>
    getKey: (S3URL: string) => string | null
    getURL: (key: string) => Promise<string>
    getS3URL: (key: string, filename: string) => Promise<string>
    getBulkDlURL: (keys: string[], filename: string) => Promise<string | Error>
}
