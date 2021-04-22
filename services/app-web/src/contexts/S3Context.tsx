import * as React from 'react'

import type { S3ClientT } from '../s3'

// For now, the Context is the same as the Client.
// We make a typealias here so that if in the future they need to diverge we
// have a separate ContextT
type S3ContextT = S3ClientT

const S3Context = React.createContext<S3ContextT | undefined>(undefined)

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
        // stole this trick from Kent C Dodds
        // https://kentcdodds.com/blog/how-to-use-react-context-effectively
        throw new Error('useS3 can only be used within an S3Provider')
    }
    return context
}

export { S3Provider, useS3 }
