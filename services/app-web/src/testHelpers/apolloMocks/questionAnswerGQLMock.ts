import { MockedResponse } from '@apollo/client/testing'
import {
    CreateQuestionDocument,
    CreateQuestionMutation,
} from '../../gen/gqlClient'

const createQuestionNetworkFailure =
    (): MockedResponse<CreateQuestionMutation> => {
        return {
            request: { query: CreateQuestionDocument },
            error: new Error('A network error occurred'),
        }
    }

export { createQuestionNetworkFailure }
