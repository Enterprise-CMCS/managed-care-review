import { UpdateInformation } from "../../gen/gqlClient";

function updateInfoMock(
    updatedAt?: Date,
    updatedReason?: string,
): UpdateInformation {
    const upAt = updatedAt ? updatedAt.toISOString() : '2023-01-01T16:54:39.173Z'
    return {
        updatedAt: upAt,
        updatedBy: 'example@state.com',
        updatedReason: updatedReason || 'initial submission'
    }
}

export {
    updateInfoMock
}
