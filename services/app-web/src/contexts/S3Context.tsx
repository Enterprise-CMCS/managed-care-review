import * as React from 'react'
import { isS3Error } from '../s3'
import { S3FileData } from '../components'
import type { S3ClientT } from '../s3'
import { BucketShortName } from '../s3/s3Amplify'
import { recordJSException } from '@mc-review/otel'
import { useAuth } from './AuthContext'
import { Loading } from '../components/Loading/Loading'
import { useLDClient } from 'launchdarkly-react-client-sdk'
import { featureFlags } from '@mc-review/common-code'

type S3ContextT = {
    handleUploadFile: (
        file: File,
        bucket: BucketShortName,
        signal?: AbortSignal
    ) => Promise<S3FileData>
    handleScanFile: (
        key: string,
        bucket: BucketShortName,
        signal?: AbortSignal
    ) => Promise<void | Error>
} & S3ClientT

const S3Context = React.createContext<S3ClientT | undefined>(undefined)

export type S3ProviderProps = {
    client: S3ClientT
    apiClient?: S3ClientT
    children: React.ReactNode
}

function S3Provider({
    client,
    apiClient,
    children,
}: S3ProviderProps): React.ReactElement {
    const { loggedInUser, featureFlagsStatus } = useAuth()
    if (apiClient && loggedInUser) {
        if (featureFlagsStatus === 'PENDING') return <Loading fullPage />
        return (
            <PinnedS3Provider
                client={client}
                apiClient={
                    featureFlagsStatus === 'READY' ? apiClient : undefined
                }
            >
                {children}
            </PinnedS3Provider>
        )
    }
    return <S3Context.Provider value={client}>{children}</S3Context.Provider>
}

function PinnedS3Provider({
    client,
    apiClient,
    children,
}: S3ProviderProps): React.ReactElement {
    const ldClient = useLDClient()
    // Pin transport for this page load: a flag update must not switch mid-upload.
    const [selectedClient] = React.useState(() =>
        apiClient &&
        ldClient?.variation(
            featureFlags.API_S3_STORAGE.flag,
            featureFlags.API_S3_STORAGE.defaultValue
        )
            ? apiClient
            : client
    )
    return <S3Context.Provider value={selectedClient} children={children} />
}

const useS3 = (): S3ContextT => {
    const context = React.useContext(S3Context)
    if (context === undefined) {
        const error = new Error('useS3 can only be used within an S3Provider')
        recordJSException(error)
        throw error
    }

    const { uploadFile, scanFile, getS3URL } = context
    const { checkAuth, logout } = useAuth()

    const handleUploadFile = async (
        file: File,
        bucket: BucketShortName,
        signal?: AbortSignal
    ): Promise<S3FileData> => {
        try {
            const s3Key = await uploadFile(file, bucket, signal)

            if (isS3Error(s3Key)) {
                const error = new Error(`Error in S3: ${file.name}`)
                recordJSException(error)
                // s3 file upload failing could be due to IDM session timeout
                // double check the user still has their session, if not, logout to update the React state with their login status
                const responseCheckAuth = await checkAuth()
                if (responseCheckAuth instanceof Error) {
                    await logout({ type: 'TIMEOUT' })
                }
                throw error
            }
            const s3URL = await getS3URL(s3Key, file.name, bucket)
            return { key: s3Key, s3URL: s3URL }
        } catch (err) {
            console.error(`uploadFile error ${err}`)
            throw err
        }
    }

    const handleScanFile = async (
        key: string,
        bucket: BucketShortName,
        signal?: AbortSignal
    ): Promise<void | Error> => {
        try {
            const s3Key = await scanFile(key, bucket, signal)
            if (isS3Error(s3Key)) {
                const error = Error(`Error in S3: ${key}`)
                recordJSException(error)

                // s3 file upload failing could be due to IDM session timeout
                // double check the user still has their session, if not, logout to update the React state with their login status
                const responseCheckAuth = await checkAuth()
                if (responseCheckAuth instanceof Error) {
                    await logout({ type: 'TIMEOUT' })
                }
                throw error
            }
        } catch (e) {
            if (signal?.aborted) throw e
            console.error('handleScanFile error:', e)
            throw e
        }
    }

    return { ...context, handleUploadFile, handleScanFile }
}

export { S3Provider, useS3 }
