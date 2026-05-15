import type { AdminUserType, ContractQuestionType } from '../../domain-models'
import {
    isDeleted,
    questionInclude,
    contractQuestionPrismaToDomainType,
} from './questionHelpers'
import { NotFoundError, UserInputPostgresError } from '../postgresErrors'
import type { ExtendedPrismaClient } from '../prismaClient'
import type { PrismaTransactionType } from '../prismaTypes'
import {
    lockContractQuestionRowForUpdate,
    runTransactionWithRowLock,
} from '../prismaHelpers'

export type SoftDeleteContractQuestionArgsType = {
    questionID: string
    user: AdminUserType
    reason: string
}

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
            `Question with id ${questionID} was not found for deletion`
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

const softDeleteContractQuestion = async (
    client: ExtendedPrismaClient,
    args: SoftDeleteContractQuestionArgsType
): Promise<ContractQuestionType | Error> => {
    return runTransactionWithRowLock({
        client,
        operationName: 'soft deleting contract question',
        lock: async (tx) =>
            await lockContractQuestionRowForUpdate(tx, args.questionID),
        transaction: async (tx) =>
            await softDeleteContractQuestionInsideTransaction(tx, args),
    })
}

export {
    softDeleteContractQuestionInsideTransaction,
    softDeleteContractQuestion,
}
