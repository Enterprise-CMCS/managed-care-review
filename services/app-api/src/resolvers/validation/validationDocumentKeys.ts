import { parseKey } from '../../s3'

type ValidationDocument = {
    s3Key?: string
    s3BucketName?: string
    s3URL?: string
}

export function getEffectiveValidationDocumentKeys(
    documents: ValidationDocument[],
    useLocalS3: boolean
): string[] {
    return documents.flatMap((document) => {
        if (!document.s3Key || !document.s3BucketName) {
            return []
        }

        if (!useLocalS3 || !document.s3URL) {
            return [document.s3Key]
        }

        const localUploadKey = parseKey(document.s3URL)

        // Local web uploads still store the fetchable object at the historical
        // key extracted from s3URL. Fall back to normalized s3Key if parsing
        // fails so deployed behavior and migrated records continue to work.
        return [
            localUploadKey instanceof Error || !localUploadKey
                ? document.s3Key
                : localUploadKey,
        ]
    })
}
