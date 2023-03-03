import { ApolloExplorer } from '@apollo/explorer/react'
import styles from './GraphQLExplorer.module.scss'
import { useAuth } from '../../contexts/AuthContext'
import { GenericErrorPage } from '../Errors/GenericErrorPage'
import { loader } from 'graphql.macro'

export const GraphQLExplorer = () => {
    const endpointUrl = process.env.REACT_APP_API_URL
    const stageName = process.env.REACT_APP_STAGE_NAME
    const { loggedInUser } = useAuth()
    const gqlSchema = loader('../../gen/schema.graphql')

    const source = gqlSchema.loc?.source.body

    if (!loggedInUser || !endpointUrl || !source) {
        return <GenericErrorPage />
    }

    const localHeaders = {
        'cognito-authentication-provider': JSON.stringify(loggedInUser),
    }

    return (
        <div className={styles.background}>
            <ApolloExplorer
                className={styles.explorer}
                endpointUrl={`${endpointUrl}/graphql`}
                schema={source}
                initialState={{
                    displayOptions: {
                        docsPanelState: 'open',
                        theme: 'light',
                    },
                    document: ``,
                    headers: stageName === 'local' ? localHeaders : undefined,
                }}
                includeCookies={stageName !== 'local'}
            />
        </div>
    )
}
