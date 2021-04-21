import { Storage } from 'aws-amplify'

type s3PutResponse = {
    key: string
}

function assertIsS3PutResponse(val: unknown): asserts val is s3PutResponse {
    if (typeof val === 'object' && val && !('key' in val)) {
        throw new Error('We dont have a key in this response')
    }
}

export async function s3AmplifyUpload(file: File): Promise<string> {
    const filename = `${Date.now()}-${file.name}`

    const stored = await Storage.vault.put(filename, file, {
        contentType: file.type,
    })

    assertIsS3PutResponse(stored)

    return stored.key
}

// In Amplify you call get to get a url to the given resource
export async function s3AmplifyGetURL(
    s3key: string
): Promise<unknown | string> {
    return Storage.vault.get(s3key)
}
