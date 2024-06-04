import type { Resolvers } from '../../gen/gqlServer'
import { Storage } from 'aws-amplify'
import Url from 'url-parse'

// tslint:disable-next-line
const isValidS3URLFormat = (url: {
    protocol: string
    slashes: boolean
    pathname: string
}): boolean => {
    return (
        url.protocol === 's3:' &&
        url.slashes === true &&
        url.pathname.split('/').length === 3
    )
}
const parseBucketName = (maybeS3URL: string): string | Error => {
    const url = new Url(maybeS3URL)
    if (!isValidS3URLFormat(url)) throw new Error('Not valid S3URL')
    return url.hostname
}

const parseKey = (maybeS3URL: string): string | Error => {
    const url = new Url(maybeS3URL)
    if (!isValidS3URLFormat(url)) return new Error('Not valid S3URL')
    return url.pathname.split('/')[1]
}

export function genericDocumentResolver(): Resolvers['GenericDocument'] {
    return {
        downloadURL: async (parent) => {
            const s3URL = parent.s3URL ?? ''
            const key = parseKey(s3URL)
            const bucket = parseBucketName(s3URL)
            if (key instanceof Error || bucket instanceof Error) {
                return null
            }

            const result = await Storage.get(key, {
                bucket,
                expires: 3600,
                download: true,
            })

            if (typeof result === 'string') {
                return result
            } else {
                const error = new Error(`Didn't get a string back from s3`)
                throw error
            }
        },
    }
}
