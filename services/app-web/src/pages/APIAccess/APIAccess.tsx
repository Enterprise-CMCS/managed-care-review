import { Button, Grid, GridContainer, Link } from '@trussworks/react-uswds'
import path from 'path-browserify'
import { useState } from 'react'
import { RoutesRecord } from '../../constants'
import {
    CreateApiKeyPayload,
    useCreateApiKeyMutation,
} from '../../gen/gqlClient'
import styles from './APIAccess.module.scss'

function APIAccess(): React.ReactElement {
    const apiURL = process.env.REACT_APP_API_URL
    if (!apiURL) {
        throw new Error('Configuration Error, REACT_APP_API_URL must be set')
    }

    const thirdPartyAPIURL = path.join(apiURL, '/v1/graphql/external')

    const [getAPIKey] = useCreateApiKeyMutation()
    const [apiKey, setAPIKey] = useState<CreateApiKeyPayload | undefined>(
        undefined
    )

    const callAPIKeyMutation = async () => {
        try {
            const result = await getAPIKey()
            setAPIKey(result.data?.createAPIKey)
        } catch (err) {
            console.error('failed to generate a new API Key', err)
            // TODO: call generic error handler
        }
    }

    const copyKeyToClipboard = async () => {
        if (apiKey) {
            await navigator.clipboard.writeText(apiKey.key)
        }
    }

    const curlCommand = !apiKey
        ? undefined
        : `
curl -s ${thirdPartyAPIURL} -X POST \\
-H "Authorization: Bearer ${apiKey.key}" \\
-H "Content-Type: application/json" \\
--data '{"query":"query IndexRates { indexRates { totalCount edges { node {  id } } } }"}'
`
    return (
        <GridContainer className={styles.pageContainer}>
            <Grid>
                <h1>API Access</h1>
                <hr />
                <h2>Credentials for using the MC-Review API</h2>
                <div>
                    To interact with the MC-Review API you will need a valid JWT
                </div>

                {!apiKey ? (
                    <div className={styles.centerButtonContainer}>
                        <Button type="button" onClick={callAPIKeyMutation}>
                            Generate API Key
                        </Button>
                    </div>
                ) : (
                    <>
                        <code
                            className={styles.wrapKey}
                            aria-label="API Key Text"
                        >
                            {apiKey.key}
                        </code>
                        <div className={styles.centerButtonContainer}>
                            <Button type="button" onClick={callAPIKeyMutation}>
                                Generate API Key
                            </Button>
                            <Button type="button" onClick={copyKeyToClipboard}>
                                Copy key to clipboard
                            </Button>
                        </div>
                    </>
                )}

                <h2>Usage</h2>
                <ul>
                    <li>Make GraphQL requests to the URL: {apiURL}</li>
                    <li>
                        Include the JWT as a Bearer token in the Authorization
                        header. Example:
                        <ul>
                            <li>
                                <code>
                                    Authorization: Bearer eyJhbGciOiJIU...
                                </code>
                            </li>
                        </ul>
                    </li>
                </ul>

                {curlCommand && (
                    <>
                        Example curl command:
                        <code className={styles.wrapKey}>{curlCommand}</code>
                    </>
                )}

                <h2>Resources</h2>
                <ul>
                    <li>
                        The MC-Review&nbsp;
                        <Link href={RoutesRecord.GRAPHQL_EXPLORER}>
                            GraphQL Explorer
                        </Link>
                        &nbsp; will allow you to format and run queries against
                        the API in all environments except production
                    </li>
                    <li>
                        The&nbsp;
                        <Link href="https://graphql.org/learn/">
                            official documentation for GraphQL
                        </Link>
                    </li>
                    <li>
                        The MC-Review&nbsp;
                        <Link href="https://github.com/Enterprise-CMCS/managed-care-review/blob/main/services/app-graphql/src/schema.graphql">
                            GraphQL Schema
                        </Link>
                        &nbsp; for understanding the shape of data returned by
                        the API
                    </li>
                </ul>
            </Grid>
        </GridContainer>
    )
}

export { APIAccess }
