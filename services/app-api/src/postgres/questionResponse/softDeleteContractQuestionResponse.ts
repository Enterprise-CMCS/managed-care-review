import type { AdminUserType, ContractQuestionType } from '../../domain-models'
import {
    isDeleted,
    questionInclude,
    contractQuestionPrismaToDomainType,
} from './questionHelpers'
import { NotFoundError, UserInputPostgresError } from '../postgresErrors'
import type { ExtendedPrismaClient } from '../prismaClient'
import type { PrismaTransactionType } from '../prismaTypes'
import { runTransactionWithRowLock } from '../prismaHelpers'

export type SoftDeleteContractQuestionResponseArgsType = {
    responseID: string
    user: AdminUserType
    reason: string
}

const latestActionInclude = {
    actions: {
        orderBy: { createdAt: 'desc' as const },
        take: 1,
    },
}

const softDeleteContractQuestionResponseInsideTransaction = async (
    tx: PrismaTransactionType,
    args: SoftDeleteContractQuestionResponseArgsType & { questionID: string }
): Promise<ContractQuestionType | Error> => {
    const { questionID, responseID, user, reason } = args

    // Re-read the parent question while holding its row lock. Pulling the target
    // response through the parent keeps this delete serialized with other
    // question/response writes and lets us re-check soft-delete state after any
    // concurrent transaction has finished.
    const existing = await tx.contractQuestion.findUnique({
        where: { id: questionID },
        include: {
            // Soft-delete state is derived from the latest action only.
            ...latestActionInclude,
            responses: {
                where: { id: responseID },
                include: {
                    ...latestActionInclude,
                    documents: { include: latestActionInclude },
                },
            },
        },
    })

    if (!existing || existing.responses.length === 0) {
        return new NotFoundError(
            `Response with id ${responseID} was not found for deletion`
        )
    }

    const response = existing.responses[0]

    if (isDeleted(response)) {
        return new UserInputPostgresError(
            `Response with id ${responseID} is already deleted`
        )
    }

    // Cascade only to active documents. If a document was already deleted by an
    // earlier admin action, keep that audit trail intact and do not add another
    // delete row for it.
    const activeResponseDocIDs = response.documents
        .filter((d) => !isDeleted(d))
        .map((d) => d.id)

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

    const deleteAction = await tx.contractQuestionResponseAction.create({
        data: {
            action: 'DELETE',
            reason,
            responseID,
            updatedByID: user.id,
        },
    })

    // Deleting a contract question response removes visible Q&A data, so it
    // should move the contract lastActionDate to the delete action timestamp.
    await tx.contractTable.update({
        where: { id: existing.contractID },
        data: {
            lastActionDate: deleteAction.createdAt,
        },
    })

    const result = await tx.contractQuestion.findUnique({
        where: { id: questionID },
        include: questionInclude,
    })

    if (!result) {
        return new NotFoundError(
            `Question with id ${questionID} was not found after deleting response`
        )
    }

    return contractQuestionPrismaToDomainType(result)
}

const softDeleteContractQuestionResponse = async (
    client: ExtendedPrismaClient,
    args: SoftDeleteContractQuestionResponseArgsType
): Promise<ContractQuestionType | Error> => {
    // The row lock helper needs the parent question id, but callers delete by
    // response id. This lookup is only for lock targeting; existence and deleted
    // state are checked again inside the transaction.
    const response = await client.contractQuestionResponse.findUnique({
        where: { id: args.responseID },
        select: { questionID: true },
    })

    if (!response) {
        return new NotFoundError(
            `Response with id ${args.responseID} was not found for deletion`
        )
    }

    return runTransactionWithRowLock({
        client,
        operationName: 'soft deleting contract question response',
        table: 'ContractQuestion',
        id: response.questionID,
        transaction: async (tx) =>
            await softDeleteContractQuestionResponseInsideTransaction(tx, {
                ...args,
                questionID: response.questionID,
            }),
    })
}

export {
    softDeleteContractQuestionResponseInsideTransaction,
    softDeleteContractQuestionResponse,
}
