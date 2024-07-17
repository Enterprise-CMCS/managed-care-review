import type { StateCodeType } from '../../common-code/healthPlanFormDataType'
import type { Division, PrismaClient } from '@prisma/client'
import { AuditAction } from '@prisma/client'
import type { CMSUserType } from '../../domain-models'
import { domainUserFromPrismaUser } from './prismaDomainUser'
import { NotFoundError } from '../postgresErrors'

export async function updateCmsUserProperties(
    client: PrismaClient,
    userID: string,
    stateCodes: StateCodeType[],
    idOfUserPerformingUpdate: string,
    divisionAssignment?: Division,
    description?: string | null
): Promise<CMSUserType | Error> {
    try {
        const statesWithCode = stateCodes.map((s) => {
            return { stateCode: s }
        })

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
                    role: 'CMS_USER',
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

        if (domainUser.role !== 'CMS_USER') {
            return new Error(
                'UNEXPECTED EXCEPTION: should have gotten a CMS user back'
            )
        }

        return domainUser
    } catch (err) {
        return err
    }
}
