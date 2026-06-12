import type { ExtendedPrismaClient } from '../prismaClient'
import { NotFoundError } from '..'
import {
    findOverrideDocumentById,
    type OverrideDocumentType,
} from './findOverrideDocumentById'
import type {
    DocumentTypes,
    SharedDocument,
} from '../../domain-models/DocumentType'

const overrideDocumentTypes: OverrideDocumentType[] = [
    'CONTRACT_DOC',
    'CONTRACT_SUPPORTING_DOC',
    'RATE_DOC',
    'RATE_SUPPORTING_DOC',
]

async function findBaseDocumentById(
    client: ExtendedPrismaClient,
    docID: string
): Promise<SharedDocument | undefined> {
    const [
        contractDoc,
        contractSupportingDoc,
        rateDoc,
        rateSupportingDoc,
        contractQuestionDoc,
        contractQuestionResponseDoc,
        rateQuestionDoc,
        rateQuestionResponseDoc,
    ] = await Promise.all([
        client.contractDocument.findUnique({ where: { id: docID } }),
        client.contractSupportingDocument.findUnique({ where: { id: docID } }),
        client.rateDocument.findUnique({ where: { id: docID } }),
        client.rateSupportingDocument.findUnique({ where: { id: docID } }),
        client.contractQuestionDocument.findUnique({ where: { id: docID } }),
        client.contractQuestionResponseDocument.findUnique({
            where: { id: docID },
        }),
        client.rateQuestionDocument.findUnique({ where: { id: docID } }),
        client.rateQuestionResponseDocument.findUnique({
            where: { id: docID },
        }),
    ])

    return (
        contractDoc ??
        contractSupportingDoc ??
        rateDoc ??
        rateSupportingDoc ??
        contractQuestionDoc ??
        contractQuestionResponseDoc ??
        rateQuestionDoc ??
        rateQuestionResponseDoc ??
        undefined
    )
}

async function validateAndFindOverrideDoc(
    client: ExtendedPrismaClient,
    docID: string,
    notFoundMessage: string,
    docType?: DocumentTypes
): Promise<SharedDocument | Error> {
    if (overrideDocumentTypes.includes(docType as OverrideDocumentType)) {
        const overrideDocumentType = docType as OverrideDocumentType
        const overrideDoc = await findOverrideDocumentById(
            client,
            docID,
            overrideDocumentType
        )
        if (overrideDoc instanceof Error) {
            return overrideDoc
        }
        if (overrideDoc) {
            return overrideDoc
        }
    }

    return new NotFoundError(notFoundMessage)
}

export async function findDocumentById(
    client: ExtendedPrismaClient,
    docID: string,
    docType?: DocumentTypes
): Promise<SharedDocument | Error> {
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
                        return validateAndFindOverrideDoc(
                            client,
                            docID,
                            err,
                            docType
                        )
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
                        return validateAndFindOverrideDoc(
                            client,
                            docID,
                            err,
                            docType
                        )
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
                        return validateAndFindOverrideDoc(
                            client,
                            docID,
                            err,
                            docType
                        )
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
                        return validateAndFindOverrideDoc(
                            client,
                            docID,
                            err,
                            docType
                        )
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
            const fetchedDoc = await findBaseDocumentById(client, docID)
            if (fetchedDoc) {
                return fetchedDoc
            }

            const err = `PRISMA ERROR: Cannot find document with id: ${docID}`
            console.error(err)
            return new NotFoundError(err)
        }
    } catch (err) {
        return err instanceof Error
            ? err
            : new Error('Failed to fetch document')
    }
}
