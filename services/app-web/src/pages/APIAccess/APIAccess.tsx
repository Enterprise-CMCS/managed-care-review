import { Button, Grid, GridContainer } from '@trussworks/react-uswds'
import { useState } from 'react'
import {
    CreateApiKeyPayload,
    useCreateApiKeyMutation,
} from '../../gen/gqlClient'
import styles from './APIAccess.module.scss'

function APIAccess(): React.ReactElement {
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

    return (
        <GridContainer className={styles.container}>
            <Grid>
                <h1>API Access</h1>
                <hr />
                <h2>Credentials for using the MC-Review API</h2>
                <div>
                    To interact with the MC-Review API you will need a valid JWT
                </div>

                <Button type="button" onClick={callAPIKeyMutation}>
                    Generate API Key
                </Button>
                {apiKey && (
                    <>
                        <code className={styles.wrapKey}>{apiKey.key}</code>
                        <Button type="button" onClick={copyKeyToClipboard}>
                            copy key to clipboard
                        </Button>
                    </>
                )}

                <h2>Usage</h2>
                <ul>
                    <li>
                        Make GraphQL requests to the URL:
                        https://api.mcreviewdev.cms.gov
                    </li>
                    <li>
                        Include the JWT as a Bearer token in the Authorization
                        header. Example:
                        <ul>
                            <li>
                                <code>
                                    Authorization: Bearer: eyJhbGciOiJIU...
                                </code>
                            </li>
                        </ul>
                    </li>
                </ul>

                <h2>Resources</h2>
                <ul>
                    <li>
                        The MC-Review GraphQL Explorer will allow you to format
                        and run queries against the API in all environments
                        except production
                    </li>
                    <li>The official documentation for GraphQL</li>
                    <li>
                        The MC-Review GraphQL Schema docs for understanding the
                        shape of data returned by the API
                    </li>
                </ul>
            </Grid>
        </GridContainer>
    )
}

export { APIAccess }
