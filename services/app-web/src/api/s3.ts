export type S3ClientT = {
    uploadFile: (f: File) => Promise<string>
    getURL: (s3key: string) => Promise<string>
}
