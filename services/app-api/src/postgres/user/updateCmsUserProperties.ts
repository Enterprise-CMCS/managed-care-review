import type { StateCodeType } from '../../common-code/healthPlanFormDataType'
import type { Division, PrismaClient } from '@prisma/client'
import { AuditAction } from '@prisma/client'
import type { CMSUsersUnionType } from '../../domain-models'
import { domainUserFromPrismaUser } from './prismaDomainUser'
import { NotFoundError, UserInputPostgresError } from '../postgresErrors'

export async function updateCmsUserProperties(
    client: PrismaClient,
    userID: string,
    idOfUserPerformingUpdate: string,
    stateCodes?: StateCodeType[],
    divisionAssignment?: Division,
    description?: string | null
): Promise<CMSUsersUnionType | Error> {
    try {
        const statesWithCode = stateCodes
            ? stateCodes.map((s) => {
                  return { stateCode: s }
              })
            : undefined

        // We do not allow States to clear our their stateAssignments. undefined will skip update in the prisma code.
        if (statesWithCode && statesWithCode.length === 0) {
            return new UserInputPostgresError(
                'cannot update stateAssignments with empty assignment array.'
            )
        }

        /* we currently update only one property at a time, so
            we can exclude state assignments if divisionAssignment is present */
        const auditAction =
            divisionAssignment !== undefined
                ? AuditAction.CHANGED_DIVISION_ASSIGNMENT
                : AuditAction.CHANGED_STATE_ASSIGNMENT

        /* get the old user values before updating */
        let userBeforeUpdate
        try {
            userBeforeUpdate = await client.user.findFirst({
                where: {
                    id: userID,
                    role: {
                        in: ['CMS_USER', 'CMS_APPROVER_USER'],
                    },
                },
                include: {
                    stateAssignments: true,
                },
            })
        } catch (err) {
            return err
        }

        if (!userBeforeUpdate) {
            return new NotFoundError('user to update was not found')
        }

        /* if all was well with the old values, update the user and make an audit record; 
            do it in one transaction to keep the tables in sync */
        const updateUserAndCreateAudit = await client.$transaction([
            client.user.update({
                where: {
                    id: userID,
                },
                data: {
                    // We don't allow no state assignments, if empty array is passed
                    stateAssignments: statesWithCode && {
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
            client.userAudit.create({
                data: {
                    user: {
                        connect: { id: userID },
                    },
                    updatedBy: {
                        connect: { id: idOfUserPerformingUpdate },
                    },
                    action: auditAction,
                    priorValue:
                        auditAction === AuditAction.CHANGED_STATE_ASSIGNMENT
                            ? JSON.stringify(userBeforeUpdate?.stateAssignments)
                            : JSON.stringify(
                                  userBeforeUpdate?.divisionAssignment
                              ),
                    description,
                },
            }),
        ])

        const updateResult = updateUserAndCreateAudit[0]

        const domainUser = domainUserFromPrismaUser(updateResult)

        if (domainUser instanceof Error) {
            return domainUser
        }

        if (
            domainUser.role !== 'CMS_USER' &&
            domainUser.role !== 'CMS_APPROVER_USER'
        ) {
            return new Error(
                'UNEXPECTED EXCEPTION: should have gotten a CMS user back'
            )
        }

        return domainUser
    } catch (err) {
        return err
    }
}
