import { ApolloExplorer } from '@apollo/explorer/react'
import styles from './GraphQLExplorer.module.scss'
import { useAuth } from '../../contexts/AuthContext'
import { GenericErrorPage } from '../Errors/GenericErrorPage'
import { FetchCurrentUserDocument } from '../../gen/gqlClient'
import { fakeAmplifyFetch, localGQLFetch } from '../../api'
import { print } from 'graphql'

import schema from '../../gen/schema.graphql'

export const GraphQLExplorer = () => {
    const stageName = import.meta.env.VITE_APP_STAGE_NAME
    const { loggedInUser } = useAuth()

    if (!loggedInUser || !schema) {
        return <GenericErrorPage />
    }

    const isLocal = stageName === 'local'

    const handleAmplifyRequest = async (
        endpointUrl: string,
        options: RequestInit
    ) => {
        if (isLocal) {
            return await localGQLFetch(endpointUrl, options)
        } else {
            return await fakeAmplifyFetch(endpointUrl, {
                ...options,
                method: 'POST',
            })
        }
    }

    return (
        <div className={styles.background}>
            <ApolloExplorer
                className={styles.explorer}
                endpointUrl={'/graphql'}
                schema={print(schema)}
                initialState={{
                    displayOptions: {
                        docsPanelState: 'open',
                        theme: 'light',
                    },
                    document: FetchCurrentUserDocument.loc?.source.body,
                }}
                handleRequest={handleAmplifyRequest}
            />
        </div>
    )
}
