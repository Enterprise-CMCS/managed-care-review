import { MockedResponse } from '@apollo/client/testing'
import { GraphQLError } from 'graphql'
import {
    UpdateDivisionAssignmentDocument,
    UpdateDivisionAssignmentInput,
    UpdateDivisionAssignmentMutation,
} from '../gen/gqlClient'

const updateDivisionMockSuccess = (
    updateInput: UpdateDivisionAssignmentInput
): MockedResponse<UpdateDivisionAssignmentMutation> => {
    return {
        request: {
            query: UpdateDivisionAssignmentDocument,
            variables: { input: updateInput },
        },
        result: {
            data: {
                updateDivisionAssignment: {
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

const updateDivisionMockError = (
    updateInput: UpdateDivisionAssignmentInput
): MockedResponse<UpdateDivisionAssignmentMutation> => {
    const graphQLError = new GraphQLError('Error attempting to unlock.', {
        extensions: {
            code: 'NOT_FOUND',
        },
    })

    return {
        request: {
            query: UpdateDivisionAssignmentDocument,
            variables: { input: updateInput },
        },
        result: {
            errors: [graphQLError],
        },
    }
}

export { updateDivisionMockSuccess, updateDivisionMockError }
