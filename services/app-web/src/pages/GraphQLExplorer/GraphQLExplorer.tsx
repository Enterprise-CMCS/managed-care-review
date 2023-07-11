import { ApolloExplorer } from '@apollo/explorer/react'
import styles from './GraphQLExplorer.module.scss'
import { useAuth } from '../../contexts/AuthContext'
import { GenericErrorPage } from '../Errors/GenericErrorPage'
import { typeDefs } from '@managed-care-review/app-graphql/src/gen/graphql.gen'
import { FetchCurrentUserDocument } from '../../gen/gqlClient'
import { fakeAmplifyFetch } from '../../api'

export const GraphQLExplorer = () => {
    const stageName = process.env.REACT_APP_STAGE_NAME
    const { loggedInUser } = useAuth()
    const schema = typeDefs.loc?.source.body

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
                schema={schema}
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
