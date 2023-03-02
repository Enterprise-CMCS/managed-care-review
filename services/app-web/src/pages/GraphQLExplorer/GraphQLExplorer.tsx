import { ApolloExplorer } from '@apollo/explorer/react'
import styles from './GraphQLExplorer.module.scss'
import { useQuery, gql } from '@apollo/client'
import { Loading } from '../../components'
import { useAuth } from '../../contexts/AuthContext'
import { GenericErrorPage } from '../Errors/GenericErrorPage'

const INTROSPECTION_QUERY = gql`
    query IntrospectionQuery {
        __schema {
            queryType {
                name
            }
            mutationType {
                name
            }
            subscriptionType {
                name
            }
            types {
                ...FullType
            }
            directives {
                name
                description

                locations
                args {
                    ...InputValue
                }
            }
        }
    }

    fragment FullType on __Type {
        kind
        name
        description

        fields(includeDeprecated: true) {
            name
            description
            args {
                ...InputValue
            }
            type {
                ...TypeRef
            }
            isDeprecated
            deprecationReason
        }
        inputFields {
            ...InputValue
        }
        interfaces {
            ...TypeRef
        }
        enumValues(includeDeprecated: true) {
            name
            description
            isDeprecated
            deprecationReason
        }
        possibleTypes {
            ...TypeRef
        }
    }

    fragment InputValue on __InputValue {
        name
        description
        type {
            ...TypeRef
        }
        defaultValue
    }

    fragment TypeRef on __Type {
        kind
        name
        ofType {
            kind
            name
            ofType {
                kind
                name
                ofType {
                    kind
                    name
                    ofType {
                        kind
                        name
                        ofType {
                            kind
                            name
                            ofType {
                                kind
                                name
                                ofType {
                                    kind
                                    name
                                }
                            }
                        }
                    }
                }
            }
        }
    }
`

export const GraphQLExplorer = () => {
    const endpointUrl = process.env.REACT_APP_API_URL
    const stageName = process.env.REACT_APP_STAGE_NAME
    const { loggedInUser } = useAuth()
    const { loading, error, data } = useQuery(INTROSPECTION_QUERY)

    if (loading || !data) {
        return <Loading />
    }

    if (error || !loggedInUser || !endpointUrl) {
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
                schema={data}
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
