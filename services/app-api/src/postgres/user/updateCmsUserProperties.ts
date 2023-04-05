import {
    convertPrismaErrorToStoreError,
    isStoreError,
    StoreError,
} from '../storeError'
import { StateCodeType } from 'app-web/src/common-code/healthPlanFormDataType'
import { Prisma, Division, PrismaClient, AuditAction } from '@prisma/client'
import { CMSUserType } from '../../domain-models'
import { domainUserFromPrismaUser } from './prismaDomainUser'

export async function updateCmsUserProperties(
    client: PrismaClient,
    userID: string,
    stateCodes: StateCodeType[],
    idOfUserPerformingUpdate: string,
    divisionAssignment?: Division,
    description?: string | null
): Promise<CMSUserType | StoreError> {
    try {
        const statesWithCode = stateCodes.map((s) => {
            return { stateCode: s }
        })

        // Determine the AuditAction based on the input
        const auditAction =
            stateCodes.length > 0
                ? AuditAction.CHANGED_STATE_ASSIGNMENT
                : AuditAction.CHANGED_DIVISION_ASSIGNMENT

        // In a transaction, we check to make sure that the user exists and is a CMS user, then perform the update
        const combinedResults = await client.$transaction([
            client.user.findFirstOrThrow({
                where: {
                    id: userID,
                    role: 'CMS_USER',
                },
                include: {
                    stateAssignments: true,
                },
            }),
            client.user.update({
                where: {
                    id: userID,
                },
                data: {
                    stateAssignments: {
                        set: statesWithCode,
                    },
                    divisionAssignment,
                },
                include: {
                    stateAssignments: {
                        orderBy: {
                            stateCode: 'asc',
                        },
                    },
                },
            }),
        ])

        const userBeforeUpdate = combinedResults[0]
        const updateResult = combinedResults[1]
        // Create the UserAudit record
        const priorValue: Prisma.JsonValue | null =
            auditAction === AuditAction.CHANGED_STATE_ASSIGNMENT
                ? JSON.stringify(userBeforeUpdate?.stateAssignments)
                : JSON.stringify(userBeforeUpdate?.divisionAssignment)

        await client.userAudit.create({
            data: {
                user: {
                    connect: { id: userID },
                },
                updatedBy: {
                    connect: { id: idOfUserPerformingUpdate },
                },
                action: auditAction,
                priorValue,
                description,
            },
        })

        const domainUser = domainUserFromPrismaUser(updateResult)

        if (isStoreError(domainUser)) {
            return domainUser
        }

        if (domainUser.role !== 'CMS_USER') {
            return {
                code: 'UNEXPECTED_EXCEPTION',
                message: 'Updated user was not a CMS User!',
            }
        }

        return domainUser
    } catch (err) {
        return convertPrismaErrorToStoreError(err)
    }
}
