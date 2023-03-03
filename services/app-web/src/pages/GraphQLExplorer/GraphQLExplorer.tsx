import { ApolloExplorer } from '@apollo/explorer/react'
import styles from './GraphQLExplorer.module.scss'
import { useAuth } from '../../contexts/AuthContext'
import { GenericErrorPage } from '../Errors/GenericErrorPage'
import { loader } from 'graphql.macro'
import { FetchCurrentUserDocument } from '../../gen/gqlClient'
import { fakeAmplifyFetch } from '../../api'

export const GraphQLExplorer = () => {
    const endpointUrl = process.env.REACT_APP_API_URL
    const stageName = process.env.REACT_APP_STAGE_NAME
    const { loggedInUser } = useAuth()
    const gqlSchema = loader('../../gen/schema.graphql')

    const schema = gqlSchema.loc?.source.body

    if (!loggedInUser || !endpointUrl || !schema) {
        return <GenericErrorPage />
    }

    const isLocal = stageName === 'local'

    const handleRequest = async (
        options: Omit<RequestInit, 'headers'> & {
            headers: Record<string, string>
        }
    ) => {
        if (isLocal) {
            options.headers = Object.assign({}, options.headers, {
                'cognito-authentication-provider': loggedInUser
                    ? JSON.stringify(loggedInUser)
                    : 'NO_USER',
            })
        }
        return await fakeAmplifyFetch('/graphql', {
            ...options,
            method: 'POST',
        })
    }

    return (
        <div className={styles.background}>
            <ApolloExplorer
                className={styles.explorer}
                endpointUrl={`${endpointUrl}/graphql`}
                schema={schema}
                initialState={{
                    displayOptions: {
                        docsPanelState: 'open',
                        theme: 'light',
                    },
                    document: FetchCurrentUserDocument.loc?.source.body,
                }}
                includeCookies={true}
                handleRequest={(endpointUrl, options) => handleRequest(options)}
            />
        </div>
    )
}
