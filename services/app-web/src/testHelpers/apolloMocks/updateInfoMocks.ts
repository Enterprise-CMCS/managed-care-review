import { UpdateInformation } from "../../gen/gqlClient";

function updateInfoMock(
    updatedAt?: Date,
    updatedReason?: string,
): UpdateInformation {
    const upAt = updatedAt ? updatedAt.toISOString() : '2023-01-01T16:54:39.173Z'
    return {
        __typename: 'UpdateInformation',
        updatedAt: upAt,
        updatedBy: {
            __typename: 'UpdatedBy',
            givenName: 'Aang',
            familyName: 'Hotman',
            role: 'STATE_USER',
            email: 'example@state.com',
        },
        updatedReason: updatedReason || 'initial submission'
    }
}

export {
    updateInfoMock
}
