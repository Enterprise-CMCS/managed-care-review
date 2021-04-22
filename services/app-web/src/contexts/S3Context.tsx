import * as React from 'react'

import { S3ClientT } from '../api'

// We save a step here and have the context return the S3ClientT directly
// If we wanted to return something different we could, but for now the S3ClientT is all we're
// really exposing.
const S3Context = React.createContext<S3ClientT>({
    uploadFile: (f: File) => Promise.resolve('INIT'),
    getURL: (s: string) => Promise.resolve('INIT'),
})

export type S3ProviderProps = {
    client: S3ClientT
    children: React.ReactNode
}

function S3Provider({ client, children }: S3ProviderProps): React.ReactElement {
    console.log('PASSED CLIENT', client)

    return <S3Context.Provider value={client} children={children} />
}

const useS3 = (): S3ClientT => React.useContext(S3Context)

export { S3Provider, useS3 }
