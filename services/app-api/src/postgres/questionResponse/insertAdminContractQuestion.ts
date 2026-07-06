import type {
    AdminCreateContractQuestionInput,
    ContractQuestionType,
    DivisionType,
} from '../../domain-models'
import type { ExtendedPrismaClient } from '../prismaClient'
import {
    contractQuestionPrismaToDomainType,
    questionInclude,
} from './questionHelpers'
import { runTransactionWithRowLock } from '../prismaHelpers'

/**
 * Creates an admin-recorded contract question. The resolver has already resolved
 * who it is attributed to and the division. The question is audited with an
 * ADMIN_CREATE action recording the reason and the admin. Written under a row
 * lock on the contract so concurrent writes serialize.
 *
 * @param client Prisma client used to run the transaction.
 * @param questionInput Resolved question to record:
 *   - `contractID` — the contract the question is attached to.
 *   - `division` — the division the question is attributed to.
 *   - `addedByUserID` — the resolved author (the admin, or the CMS user being
 *     asked on behalf of).
 *   - `createdByAdminID` — the admin performing the action, recorded as
 *     `updatedBy` on the ADMIN_CREATE audit action.
 *   - `reason` — the reason recorded on the audit action.
 *   - `createdAt` — optional backfilled created date; defaults to now when omitted.
 *   - `documents` — the question documents (already validated by the resolver).
 * @returns The created question parsed to its domain type, or an Error.
 */
export async function insertAdminContractQuestion(
    client: ExtendedPrismaClient,
    questionInput: AdminCreateContractQuestionInput
): Promise<ContractQuestionType | Error> {
    // Documents should already have s3BucketName and s3Key from resolver validation
    const documents = questionInput.documents.map((document) => ({
        name: document.name,
        s3URL: document.s3URL,
        s3BucketName: document.s3BucketName,
        s3Key: document.s3Key,
    }))

    const result = await runTransactionWithRowLock({
        client,
        operationName: 'insertAdminContractQuestion',
        table: 'ContractTable',
        id: questionInput.contractID,
        transaction: async (tx) => {
            const created = await tx.contractQuestion.create({
                data: {
                    // Backfill date when provided; otherwise the column defaults to now.
                    ...(questionInput.createdAt && {
                        createdAt: questionInput.createdAt,
                    }),
                    contract: {
                        connect: {
                            id: questionInput.contractID,
                        },
                    },
                    addedBy: {
                        connect: {
                            id: questionInput.addedByUserID,
                        },
                    },
                    division: questionInput.division as DivisionType,
                    documents: {
                        create: documents,
                    },
                    // Audit the admin entry. The action's createdAt defaults to
                    // now (the real time), even when the question's createdAt is
                    // backfilled to an earlier date.
                    actions: {
                        create: {
                            action: 'ADMIN_CREATE',
                            reason: questionInput.reason,
                            updatedBy: {
                                connect: {
                                    id: questionInput.createdByAdminID,
                                },
                            },
                        },
                    },
                },
                include: questionInclude,
            })

            return contractQuestionPrismaToDomainType(created)
        },
    })

    return result
}
