import { Storage } from 'aws-amplify'

import { S3ClientT } from './s3'

type s3PutResponse = {
    key: string
}

function assertIsS3PutResponse(val: unknown): asserts val is s3PutResponse {
    if (typeof val === 'object' && val && !('key' in val)) {
        throw new Error('We dont have a key in this response')
    }
}

export function newAmplifyS3Client(): S3ClientT {
    return {
        uploadFile: async (file: File): Promise<string> => {
            const filename = `${Date.now()}-${file.name}`

            const stored = await Storage.vault.put(filename, file, {
                contentType: file.type,
            })

            assertIsS3PutResponse(stored)

            return stored.key
        },
        getURL: async (s3key: string): Promise<string> => {
            const result = await Storage.vault.get(s3key)
            if (typeof result === 'string') {
                return result
            } else {
                console.log('what is this tho', result)
                return 'ERROR: WHAT IS THIS'
            }
        },
    }
}
