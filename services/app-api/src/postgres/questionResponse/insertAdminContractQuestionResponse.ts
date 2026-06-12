import type {
    AdminCreateContractQuestionResponseInput,
    ContractQuestionType,
} from '../../domain-models'
import {
    isDeleted,
    questionInclude,
    contractQuestionPrismaToDomainType,
} from './questionHelpers'
import { NotFoundError, UserInputPostgresError } from '../postgresErrors'
import type { ExtendedPrismaClient } from '../prismaClient'
import { runTransactionWithRowLock } from '../prismaHelpers'

const startOfUTCDay = (date: Date): Date =>
    new Date(
        Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
    )

/**
 * Records an admin-authored response on an existing contract question (including
 * questions authored by CMS). The response is audited with an ADMIN_CREATE action
 * recording the reason and the admin. Runs under a row lock on the question.
 *
 * @param client Prisma client used to run the transaction.
 * @param response Resolved response to record:
 *   - `questionID` — the question being responded to.
 *   - `addedByUserID` — the resolved author (a state user, or the admin).
 *   - `createdByAdminID` — the admin performing the action, recorded as
 *     `updatedBy` on the ADMIN_CREATE audit action.
 *   - `reason` — the reason recorded on the audit action.
 *   - `createdAt` — optional backfilled response date; defaults to now when
 *     omitted, and cannot predate the question's created date.
 *   - `documents` — the response documents (already validated by the resolver).
 * @returns The question (with the new response) parsed to its domain type, or an Error.
 */
export async function insertAdminContractQuestionResponse(
    client: ExtendedPrismaClient,
    response: AdminCreateContractQuestionResponseInput
): Promise<ContractQuestionType | Error> {
    const documents = response.documents.map((document) => ({
        name: document.name,
        s3URL: document.s3URL,
        s3BucketName: document.s3BucketName,
        s3Key: document.s3Key,
    }))

    return runTransactionWithRowLock({
        client,
        operationName: 'insertAdminContractQuestionResponse',
        table: 'ContractQuestion',
        id: response.questionID,
        transaction: async (tx) => {
            const question = await tx.contractQuestion.findFirst({
                where: {
                    id: response.questionID,
                },
                include: {
                    actions: {
                        orderBy: {
                            createdAt: 'desc',
                        },
                        take: 1,
                    },
                },
            })

            if (!question) {
                return new NotFoundError('Question was not found to respond to')
            }

            if (isDeleted(question)) {
                return new UserInputPostgresError(
                    `Cannot create response for question with the ID: ${response.questionID}. Question was deleted.`
                )
            }

            // User-entered response dates are date-only, so compare them to the
            // question's calendar day. If no date is supplied, the DB timestamp
            // defaults to now and this backfill validation does not apply.
            if (
                response.createdAt &&
                response.createdAt < startOfUTCDay(question.createdAt)
            ) {
                return new UserInputPostgresError(
                    'the response date cannot be before the question was created'
                )
            }

            const result = await tx.contractQuestion.update({
                where: {
                    id: response.questionID,
                },
                data: {
                    responses: {
                        create: {
                            ...(response.createdAt && {
                                createdAt: response.createdAt,
                            }),
                            addedBy: {
                                connect: {
                                    id: response.addedByUserID,
                                },
                            },
                            documents: {
                                create: documents,
                            },
                            // Audit the admin entry. The action's createdAt
                            // defaults to now (the real time), even when the
                            // response's createdAt is backfilled.
                            actions: {
                                create: {
                                    action: 'ADMIN_CREATE',
                                    reason: response.reason,
                                    updatedBy: {
                                        connect: {
                                            id: response.createdByAdminID,
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                include: questionInclude,
            })

            return contractQuestionPrismaToDomainType(result)
        },
    })
}
