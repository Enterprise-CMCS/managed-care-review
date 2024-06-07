import type { Resolvers } from '../../gen/gqlServer'	
import { GetObjectCommand } from '@aws-sdk/client-s3'
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
const streamToString = (stream: any): Promise<String> =>
new Promise((resolve, reject) => {
  const chunks: any[] = [];
  stream.on("data", (chunk: any) => chunks.push(chunk));
  stream.on("error", reject);
  stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
});
export function genericDocumentResolver(s3: any): Resolvers['GenericDocument'] {
    return {
        downloadURL: async (parent) => {
            try {
                const s3URL = parent.s3URL ?? ''
                const key = parseKey(s3URL)
                const bucket = parseBucketName(s3URL)
                if (key instanceof Error || bucket instanceof Error) {
                    // todo throw error
                    return 'err'
                }
                const url = await s3.send(
                    new GetObjectCommand({
                        Bucket: bucket,
                        Key: key,
                    })
                )
                .then((data:any) => {
                    console.log(data)
                    return data
                })
                .catch((err: any) => console.log(err));
                // const content = await streamToString(stream);
                return url
        } catch(e) {
            console.error(e)
            return 'test'
            // throw error
        }
    }
    }  
}