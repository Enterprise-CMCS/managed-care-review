import { MockedResponse } from '@apollo/client/testing'
import { GraphQLError } from 'graphql'
import {
    UpdateCmsUserDocument,
    UpdateCmsUserInput,
    UpdateCmsUserMutation,
} from '../gen/gqlClient'

const updateUserMockSuccess = (
    updateInput: UpdateCmsUserInput
): MockedResponse<UpdateCmsUserMutation> => {
    return {
        request: {
            query: UpdateCmsUserDocument,
            variables: { input: updateInput },
        },
        result: {
            data: {
                updateCMSUser: {
                    user: {
                        __typename: 'CMSUser',
                        id: updateInput.cmsUserID,
                        email: 'zuko@example.com',
                        role: 'CMS_USER',
                        familyName: 'foo',
                        givenName: 'bar',
                        stateAssignments: [],
                        divisionAssignment: updateInput.divisionAssignment,
                    },
                },
            },
        },
    }
}

const updateUserMockError = (
    updateInput: UpdateCmsUserInput
): MockedResponse<UpdateCmsUserMutation> => {
    const graphQLError = new GraphQLError('Error attempting to unlock.', {
        extensions: {
            code: 'NOT_FOUND',
        },
    })

    return {
        request: {
            query: UpdateCmsUserDocument,
            variables: { input: updateInput },
        },
        result: {
            errors: [graphQLError],
        },
    }
}

export { updateUserMockSuccess, updateUserMockError }
