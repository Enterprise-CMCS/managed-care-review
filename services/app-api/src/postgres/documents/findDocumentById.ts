import type { ExtendedPrismaClient } from '../prismaClient'
import { NotFoundError } from '..'
import { findAllDocuments } from '.'
import type {
    DocumentTypes,
    SharedDocument,
} from '../../domain-models/DocumentType'

export async function findDocumentById(
    client: ExtendedPrismaClient,
    docID: string,
    docType?: DocumentTypes
): Promise<SharedDocument | NotFoundError | Error> {
    try {
        if (docType) {
            switch (docType) {
                case 'CONTRACT_DOC':
                    const contractDoc =
                        await client.contractDocument.findUnique({
                            where: {
                                id: docID,
                            },
                        })
                    if (!contractDoc) {
                        const err = `PRISMA ERROR: Cannot find contract document with id: ${docID}`
                        return new NotFoundError(err)
                    }
                    return contractDoc
                case 'CONTRACT_SUPPORTING_DOC':
                    const contractSupportingDoc =
                        await client.contractSupportingDocument.findUnique({
                            where: {
                                id: docID,
                            },
                        })
                    if (!contractSupportingDoc) {
                        const err = `PRISMA ERROR: Cannot find contract supporting document with id: ${docID}`
                        return new NotFoundError(err)
                    }
                    return contractSupportingDoc
                case 'RATE_DOC':
                    const rateDoc = await client.rateDocument.findUnique({
                        where: {
                            id: docID,
                        },
                    })
                    if (!rateDoc) {
                        const err = `PRISMA ERROR: Cannot find rate document with id: ${docID}`
                        return new NotFoundError(err)
                    }
                    return rateDoc
                case 'RATE_SUPPORTING_DOC':
                    const rateSupportingDoc =
                        await client.rateSupportingDocument.findUnique({
                            where: {
                                id: docID,
                            },
                        })
                    if (!rateSupportingDoc) {
                        const err = `PRISMA ERROR: Cannot find rate supporting document with id: ${docID}`
                        return new NotFoundError(err)
                    }
                    return rateSupportingDoc
                case 'CONTRACT_QUESTION_DOC':
                    const contractQuestionDoc =
                        await client.contractQuestionDocument.findUnique({
                            where: {
                                id: docID,
                            },
                        })
                    if (!contractQuestionDoc) {
                        const err = `PRISMA ERROR: Cannot find contract question document with id: ${docID}`
                        return new NotFoundError(err)
                    }
                    return contractQuestionDoc
                case 'CONTRACT_QUESTION_RESPONSE_DOC':
                    const contractQuestionResponseDoc =
                        await client.contractQuestionResponseDocument.findUnique(
                            {
                                where: {
                                    id: docID,
                                },
                            }
                        )
                    if (!contractQuestionResponseDoc) {
                        const err = `PRISMA ERROR: Cannot find contract question response document with id: ${docID}`
                        return new NotFoundError(err)
                    }
                    return contractQuestionResponseDoc
                case 'RATE_QUESTION_DOC':
                    const rateQuestionDoc =
                        await client.rateQuestionDocument.findUnique({
                            where: {
                                id: docID,
                            },
                        })
                    if (!rateQuestionDoc) {
                        const err = `PRISMA ERROR: Cannot find rate question document with id: ${docID}`
                        return new NotFoundError(err)
                    }
                    return rateQuestionDoc
                case 'RATE_QUESTION_RESPONSE_DOC':
                    const rateQuestionResponseDoc =
                        await client.rateQuestionResponseDocument.findUnique({
                            where: {
                                id: docID,
                            },
                        })
                    if (!rateQuestionResponseDoc) {
                        const err = `PRISMA ERROR: Cannot find rate question response document with id: ${docID}`
                        return new NotFoundError(err)
                    }
                    return rateQuestionResponseDoc
                default:
                    throw new Error(`Unsupported docType: ${docType}`)
            }
        } else {
            // fetch all the documents in the db
            const allDocs = await findAllDocuments(client)
            if (allDocs instanceof Error) {
                const err = `Fetching all documents failed: ${allDocs.message}`
                console.error(err)
                return new Error(err)
            }

            // find document by id
            const fetchedDoc = allDocs.find((doc) => doc.id === docID)
            if (!fetchedDoc) {
                const err = `PRISMA ERROR: Cannot find document with id: ${docID}`
                console.error(err)
                return new NotFoundError(err)
            }

            return fetchedDoc
        }
    } catch (err) {
        return err instanceof Error
            ? err
            : new Error('Failed to fetch document')
    }
}
