import { ApolloExplorer } from '@apollo/explorer/react'
import styles from './GraphQLExplorer.module.scss'
import { useAuth } from '../../contexts/AuthContext'
import { GenericErrorPage } from '../Errors/GenericErrorPage'
import { FetchCurrentUserDocument } from '../../gen/gqlClient'
import { fakeAmplifyFetch } from '../../api'
import { print } from 'graphql'

import schema from '../../gen/schema.graphql'

export const GraphQLExplorer = () => {
    const stageName = import.meta.env.VITE_APP_STAGE_NAME
    const { loggedInUser } = useAuth()

    if (!loggedInUser || !schema) {
        return <GenericErrorPage />
    }

    const isLocal = stageName === 'local'
    const localHeaders = {
        'cognito-authentication-provider':
            JSON.stringify(loggedInUser) || 'NO_USER',
    }

    const handleAmplifyRequest = async (
        endpointUrl: string,
        options: RequestInit
    ) => {
        return await fakeAmplifyFetch(endpointUrl, {
            ...options,
            method: 'POST',
        })
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
                    // Configuring request for local env. This is done here so the UI will display localHeaders which can be modified
                    headers: isLocal ? localHeaders : undefined,
                }}
                handleRequest={(endpointUrl, options) =>
                    handleAmplifyRequest(endpointUrl, options)
                }
            />
        </div>
    )
}
