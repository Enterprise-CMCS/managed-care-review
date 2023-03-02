import { Document } from '../gen/gqlClient'
import { useS3 } from '../contexts/S3Context'
import { BucketShortName } from '../s3/s3Amplify'
import { SubmissionDocument } from '../common-code/healthPlanFormDataType'

type UnionDocumentType = Document | SubmissionDocument
type ParsedDocumentWithLinkType =
    | ({ url: string | null } & Document)
    | SubmissionDocument

const useDocument = () => {
    const { getKey, getURL } = useS3()

    const getDocumentsUrl = async (
        documents: UnionDocumentType[],
        bucket: BucketShortName
    ): Promise<ParsedDocumentWithLinkType[]> => {
        return await Promise.all(
            documents.map(async (doc) => {
                const key = getKey(doc.s3URL)
                if (!key)
                    return {
                        ...doc,
                        url: null,
                    }

                const documentLink = await getURL(key, bucket)
                return {
                    ...doc,
                    url: documentLink,
                }
            })
        ).catch((err) => {
            console.info(err)
            return []
        })
    }

    return { getDocumentsUrl }
}

export { useDocument }
