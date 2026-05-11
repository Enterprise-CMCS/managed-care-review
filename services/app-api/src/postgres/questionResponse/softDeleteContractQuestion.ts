import type { AdminUserType, ContractQuestionType } from '../../domain-models'
import {
    isDeleted,
    questionInclude,
    contractQuestionPrismaToDomainType,
} from './questionHelpers'
import { NotFoundError, UserInputPostgresError } from '../postgresErrors'
import type { ExtendedPrismaClient } from '../prismaClient'
import type { PrismaTransactionType } from '../prismaTypes'
import { parseErrorToError } from '@mc-review/helpers'
import { Prisma } from '../../generated/client'

export type SoftDeleteContractQuestionArgsType = {
    questionID: string
    user: AdminUserType
    reason: string
}

const MAX_SERIALIZATION_RETRIES = 2

/**
 * Soft-deletes a contract question and cascades the delete to its responses
 * and documents (both question-level and response-level). Each row gets a new
 * audit action: DELETE on the question itself, CASCADE_DELETE on every
 * currently-active descendant. Already-deleted descendants are skipped so
 * repeated calls don't pile up redundant action rows.
 *
 * @param tx - The Prisma transaction object used for database operations
 * @param args
 * @param args.questionID - ID of the contract question to soft delete
 * @param args.user - Admin user performing the delete
 * @param args.reason - Reason recorded on every action row
 */
const softDeleteContractQuestionInsideTransaction = async (
    tx: PrismaTransactionType,
    args: SoftDeleteContractQuestionArgsType
): Promise<ContractQuestionType | Error> => {
    const { questionID, user, reason } = args

    // 1. Pull only the latest action per row — that's all we need to read soft-delete state.
    const latestActionInclude = {
        actions: {
            orderBy: { createdAt: 'desc' as const },
            take: 1,
        },
    }

    // 2. Snapshot question + descendants with their latest action.
    const existing = await tx.contractQuestion.findUnique({
        where: { id: questionID },
        include: {
            ...latestActionInclude,
            documents: { include: latestActionInclude },
            responses: {
                include: {
                    ...latestActionInclude,
                    documents: { include: latestActionInclude },
                },
            },
        },
    })

    if (!existing) {
        return new NotFoundError(
            `Question with id ${questionID} was not found to delete`
        )
    }

    // 3. Already deleted → surface a typed error so the resolver can emit
    //    BAD_USER_INPUT. Race-loser ends up here too, which is honest: from
    //    their POV the question really was already deleted.
    if (isDeleted(existing)) {
        return new UserInputPostgresError(
            `Question with id ${questionID} is already deleted`
        )
    }

    // 4. Collect active descendants — skip ones already deleted so we don't overwrite prior DELETEs.
    const activeQuestionDocIDs = existing.documents
        .filter((d) => !isDeleted(d))
        .map((d) => d.id)

    const activeResponses = existing.responses.filter((r) => !isDeleted(r))
    const activeResponseIDs = activeResponses.map((r) => r.id)
    const activeResponseDocIDs = activeResponses.flatMap((r) =>
        r.documents.filter((d) => !isDeleted(d)).map((d) => d.id)
    )

    // 5. Cascade CASCADE_DELETE rows to question docs, responses, and response docs.
    if (activeQuestionDocIDs.length > 0) {
        await tx.contractQuestionDocumentAction.createMany({
            data: activeQuestionDocIDs.map((documentID) => ({
                action: 'CASCADE_DELETE' as const,
                reason,
                documentID,
                updatedByID: user.id,
            })),
        })
    }

    if (activeResponseIDs.length > 0) {
        await tx.contractQuestionResponseAction.createMany({
            data: activeResponseIDs.map((responseID) => ({
                action: 'CASCADE_DELETE' as const,
                reason,
                responseID,
                updatedByID: user.id,
            })),
        })
    }

    if (activeResponseDocIDs.length > 0) {
        await tx.contractQuestionResponseDocumentAction.createMany({
            data: activeResponseDocIDs.map((documentID) => ({
                action: 'CASCADE_DELETE' as const,
                reason,
                documentID,
                updatedByID: user.id,
            })),
        })
    }

    // 6. Write the DELETE on the question itself and refetch with the standard read-side include.
    const result = await tx.contractQuestion.update({
        where: { id: questionID },
        data: {
            actions: {
                create: {
                    action: 'DELETE',
                    reason,
                    updatedBy: { connect: { id: user.id } },
                },
            },
        },
        include: questionInclude,
    })

    return contractQuestionPrismaToDomainType(result)
}

/**
 * Wrapper around `softDeleteContractQuestionInsideTransaction` that owns the
 * transaction lifecycle.
 *
 * Race-condition protection follows Prisma's recommendation for write-write
 * conflicts: run the transaction at Serializable isolation and retry on
 * serialization failures. Depending on which engine is active, Prisma surfaces
 * these as either `P2034` (standard engine) or a DriverAdapterError with
 * `cause.kind === 'TransactionWriteConflict'` (driver adapters).
 */
const softDeleteContractQuestion = async (
    client: ExtendedPrismaClient,
    args: SoftDeleteContractQuestionArgsType
): Promise<ContractQuestionType | Error> => {
    let attempt = 0
    while (true) {
        try {
            return await client.$transaction(
                async (tx) =>
                    await softDeleteContractQuestionInsideTransaction(tx, args),
                {
                    isolationLevel:
                        Prisma.TransactionIsolationLevel.Serializable,
                }
            )
        } catch (err) {
            // Serialization conflicts surface two ways depending on the
            // engine in use: as `code: 'P2034'` from the standard Prisma
            // engine, or as a DriverAdapterError whose `cause.kind` is
            // `'TransactionWriteConflict'` from driver adapters. Match both.
            const code = (err as { code?: string }).code
            const cause = (err as { cause?: { kind?: string } }).cause
            const isWriteConflict =
                code === 'P2034' || cause?.kind === 'TransactionWriteConflict'
            if (isWriteConflict && attempt < MAX_SERIALIZATION_RETRIES - 1) {
                console.warn(
                    `softDeleteContractQuestion: serialization conflict, retrying. questionID=${args.questionID} attempt=${attempt + 1}`
                )
                attempt++
                continue
            }
            const parsedError = parseErrorToError(err)
            console.error(
                `PRISMA ERROR: Error soft deleting contract question: ${parsedError.message}`
            )
            return parsedError
        }
    }
}

export {
    softDeleteContractQuestionInsideTransaction,
    softDeleteContractQuestion,
}
