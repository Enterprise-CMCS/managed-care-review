import { MockedResponse } from "@apollo/client/testing"
import { CreateApiKeyDocument, CreateApiKeyMutation } from "../../gen/gqlClient"

function createAPIKeySuccess(): MockedResponse<CreateApiKeyMutation> {

    return {
        request: {
            query: CreateApiKeyDocument,
        },
        result: {
            data: {
                createAPIKey: {
                    key: 'foo.bar.baz.key123',
                    expiresAt: '2025-01-31T21:08:57.951Z',
                },
            },
        },
    }
}

function createAPIKeyNetworkError(): MockedResponse<CreateApiKeyMutation> {
    return {
        request: {
            query: CreateApiKeyDocument,
        },
        error: new Error('A network error occurred'),
    }
}

export {
    createAPIKeySuccess,
    createAPIKeyNetworkError,
}
