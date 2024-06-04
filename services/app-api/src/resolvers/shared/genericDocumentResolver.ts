import type { Resolvers } from '../../gen/gqlServer'

export function genericDocumentResolver(): Resolvers['GenericDocument'] {
    return {
        // call s3
        // populate downloadURL
        downloadURL(parent) {
            return null
        },
    }
}
