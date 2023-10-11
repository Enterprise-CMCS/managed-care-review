import { useCallback } from 'react'
import { Document, GenericDocument } from '../gen/gqlClient'
import { useS3 } from '../contexts/S3Context'
import { BucketShortName } from '../s3/s3Amplify'
import { SubmissionDocument } from '../common-code/healthPlanFormDataType'

type UnionDocumentType = Document | SubmissionDocument
type ParsedDocumentWithLinkType =
    | ({ url: string | null } & Document)
    | SubmissionDocument
    | GenericDocument

const useDocument = () => {
    const { getKey, getURL } = useS3()
    const getDocumentsWithS3KeyAndUrl = useCallback(
        async <T = Record<string, unknown>,>(
            documents: Array<(T & UnionDocumentType) | GenericDocument>,
            bucket: BucketShortName
        ): Promise<Array<T & ParsedDocumentWithLinkType>> => {
            return await Promise.all(
                documents.map(async (doc) => {
                    const key = getKey(doc.s3URL)
                    if (!key)
                        return {
                            ...doc,
                            s3Key: null,
                            url: null,
                        }

                    const documentLink = await getURL(key, bucket)
                    return {
                        ...doc,
                        s3Key: key,
                        url: documentLink,
                    }
                })
            ).catch((err) => {
                console.info(err)
                return []
            })
        },
        [getURL, getKey]
    )

    return { getDocumentsWithS3KeyAndUrl }
}

export { useDocument }
