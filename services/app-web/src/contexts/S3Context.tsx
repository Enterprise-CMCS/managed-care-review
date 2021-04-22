import * as React from 'react'

type S3ContextType = {
    uploadFile: (f: File) => Promise<string>
    getURL: (s3key: string) => Promise<string>
}

const S3Context = React.createContext<S3ContextType>({
    uploadFile: (f: File) => Promise.resolve('INIT'),
    getURL: (s: string) => Promise.resolve('INIT'),
})

export type S3ClientT = {
    uploadFile: (f: File) => Promise<string>
    getURL: (s3key: string) => Promise<string>
}

export type S3ProviderProps = {
    client: S3ClientT
    children: React.ReactNode
}

function S3Provider({ client, children }: S3ProviderProps): React.ReactElement {
    console.log('PASSED CLIENT', client)

    return (
        <S3Context.Provider
            value={{
                uploadFile: client.uploadFile,
                getURL: client.getURL,
            }}
            children={children}
        />
    )
}

const useS3 = (): S3ContextType => React.useContext(S3Context)

export { S3Provider, useS3 }
