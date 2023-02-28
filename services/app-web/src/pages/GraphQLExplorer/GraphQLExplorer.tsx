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
    const endpointUrl = 'http://localhost:3030/local/graphql'
    const { loggedInUser } = useAuth()
    const { loading, error, data } = useQuery(INTROSPECTION_QUERY)

    if (loading || !data) {
        return <Loading />
    }

    if (error || !loggedInUser) {
        return <GenericErrorPage />
    }

    return (
        <div className={styles.background}>
            <ApolloExplorer
                className={styles.explorer}
                endpointUrl={endpointUrl}
                schema={data}
                initialState={{
                    headers: {
                        'cognito-authentication-provider':
                            JSON.stringify(loggedInUser),
                    },
                    displayOptions: {
                        docsPanelState: 'open',
                        theme: 'light',
                    },
                }}
            />
        </div>
    )
}
