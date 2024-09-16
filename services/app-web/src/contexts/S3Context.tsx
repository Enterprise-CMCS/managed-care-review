import * as React from 'react'
import { isS3Error } from '../s3'
import { S3FileData } from '../components'
import type { S3ClientT } from '../s3'
import { BucketShortName } from '../s3/s3Amplify'
import { recordJSException } from '../otelHelpers'
import { useAuth } from './AuthContext'

type S3ContextT = {
    handleUploadFile: (
        file: File,
        bucket: BucketShortName
    ) => Promise<S3FileData>
    handleScanFile: (
        key: string,
        bucket: BucketShortName
    ) => Promise<void | Error>
    handleDeleteFile: (
        key: string,
        bucket: BucketShortName,
        permanentFileKeys?: string[]
    ) => Promise<void>
} & S3ClientT

const S3Context = React.createContext<S3ClientT | undefined>(undefined)

export type S3ProviderProps = {
    client: S3ClientT
    children: React.ReactNode
}

function S3Provider({ client, children }: S3ProviderProps): React.ReactElement {
    return <S3Context.Provider value={client} children={children} />
}

const useS3 = (): S3ContextT => {
    const context = React.useContext(S3Context)
    if (context === undefined) {
        const error = new Error('useS3 can only be used within an S3Provider')
        recordJSException(error)
        throw error
    }

    const { deleteFile, uploadFile, scanFile, getS3URL } = context
    const {checkAuth, logout} = useAuth()

    const handleUploadFile = async (
        file: File,
        bucket: BucketShortName
    ): Promise<S3FileData> => {
        const s3Key = await uploadFile(file, bucket)

        if (isS3Error(s3Key)) {
            const error = new Error(`Error in S3: ${file.name}`)
            recordJSException(error)
            // s3 file upload failing could be due to IDM session timeout
            // double check the user still has their session, if not, logout to update the React state with their login status
            const responseCheckAuth = await checkAuth()
            if (responseCheckAuth instanceof Error){
                await logout({type: 'TIMEOUT'})
            }
            throw error
        }
        const s3URL = await getS3URL(s3Key, file.name, bucket)
        return { key: s3Key, s3URL: s3URL }
    }

    const handleScanFile = async (
        key: string,
        bucket: BucketShortName
    ): Promise<void | Error> => {
        try {
            await scanFile(key, bucket)
        } catch (e) {
            if (isS3Error(e)) {
                const error = new Error(`Error in S3: ${key}`)
                recordJSException(error)
                throw error
            }
        // s3 file upload failing could be due to IDM session timeout
            // double check the user still has their session, if not, logout to update the React state with their login status
            const responseCheckAuth = await checkAuth()
            if (responseCheckAuth instanceof Error){
                await logout({type: 'TIMEOUT'})
            }
            const error = new Error('Scanning error: Scanning retry timed out')
            recordJSException(error)
            throw error
        }
    }
    // We often don't want to actually delete a resource from s3 and that's what permanentFileKeys is for
    // e.g. document files that also exist on already submitted packages are part of permanent record, even if deleted on a later revision
    const handleDeleteFile = async (
        key: string,
        bucket: BucketShortName,
        permanentFileKeys?: string[]
    ) => {
        const shouldPreserveFile =
            permanentFileKeys &&
            Boolean(
                permanentFileKeys.some((testFileKey) => testFileKey === key)
            )

        if (!shouldPreserveFile) {
            const result = await deleteFile(key, bucket)
            if (isS3Error(result)) {
                const error = new Error(`Error in S3 key: ${key}`)
                recordJSException(error)
                throw error
            }
        }
    }

    return { ...context, handleUploadFile, handleScanFile, handleDeleteFile }
}

export { S3Provider, useS3 }
