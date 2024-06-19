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
    // if (!isValidS3URLFormat(url)) throw new Error('Not valid S3URL')
    return url.hostname
}

const parseKey = (maybeS3URL: string): string | Error => {
    const url = new Url(maybeS3URL)
    // if (!isValidS3URLFormat(url)) return new Error('Not valid S3URL')
    return url.pathname.split('/')[1]
}
type BucketShortName = 'HEALTH_PLAN_DOCS' | 'QUESTION_ANSWER_DOCS'
type S3BucketConfigType = {
    [K in BucketShortName]: string
}
export { parseBucketName, parseKey }
export type { BucketShortName, S3BucketConfigType }
