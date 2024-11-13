import { AuditAction } from '@prisma/client'
import type { PrismaClient } from '@prisma/client'
import type { StateCodeType } from '../../common-code/healthPlanFormDataType'
import type { UserType } from '../../domain-models'
import { NotFoundError, UserInputPostgresError } from '../postgresErrors'
import type { PrismaTransactionType } from '../prismaTypes'
import { parseDomainUsersFromPrismaUsers } from '../user/prismaDomainUser'

async function updateStateAssignedUsersInTransaction(
    tx: PrismaTransactionType,
    idOfUserPerformingUpdate: string,
    stateCode: StateCodeType,
    assignedUserIDs: string[]
): Promise<UserType[] | Error> {
    // get the state
    const state = await tx.state.findUnique({
        where: {
            stateCode: stateCode,
        },
        include: {
            assignedCMSUsers: {
                include: {
                    stateAssignments: true,
                },
            },
        },
    })

    if (!state) {
        return new NotFoundError('no state with code ' + stateCode)
    }

    const previousUsers = await tx.user.findMany({
        where: {
            id: {
                in: assignedUserIDs,
            },
        },
        include: {
            stateAssignments: true,
        },
    })

    if (previousUsers.length !== assignedUserIDs.length) {
        const badUserMessage = `Some assigned user IDs do not exist or are duplicative. ${previousUsers.length} users found in database`
        return new UserInputPostgresError(badUserMessage)
    }

    const nonCMSUsers = previousUsers.filter(
        (u) => !['CMS_USER', 'CMS_APPROVER_USER'].includes(u.role)
    )
    if (nonCMSUsers.length > 0) {
        const badUserMessage = `Attempted to assign non-cms-users to a state: [${nonCMSUsers.map((u) => u.id)}]`
        return new UserInputPostgresError(badUserMessage)
    }

    // find all previously assigned users no longer assigned
    const removedUsers = state.assignedCMSUsers.filter(
        (u) => !assignedUserIDs.includes(u.id)
    )

    // find newly assigned users
    const newlyAssignedUsers = previousUsers.filter(
        (u) => !state.assignedCMSUsers.find((au) => au.id === u.id)
    )

    // set links in state
    try {
        const updatedState = await tx.state.update({
            where: {
                stateCode: stateCode,
            },
            data: {
                assignedCMSUsers: {
                    set: assignedUserIDs.map((id) => ({ id: id })),
                },
            },
            include: {
                assignedCMSUsers: {
                    include: {
                        stateAssignments: true,
                    },
                },
            },
        })

        // set audit table for all affected users
        interface UserAuditStub {
            modifiedUserID: string
            previousValue: string
        }

        const modifiedUsers: UserAuditStub[] = []
        modifiedUsers.push(
            ...removedUsers.map((r) => ({
                modifiedUserID: r.id,
                previousValue: JSON.stringify(r.stateAssignments),
            }))
        )
        modifiedUsers.push(
            ...newlyAssignedUsers.map((r) => ({
                modifiedUserID: r.id,
                previousValue: JSON.stringify(r.stateAssignments),
            }))
        )

        await tx.userAudit.createMany({
            data: modifiedUsers.map((u) => ({
                modifiedUserId: u.modifiedUserID,
                updatedByUserId: idOfUserPerformingUpdate,
                action: AuditAction.CHANGED_STATE_ASSIGNMENT,
                description: 'updated state assignments',
                priorValue: u.previousValue,
            })),
        })

        // convert users.
        const users = parseDomainUsersFromPrismaUsers(
            updatedState.assignedCMSUsers
        )

        return users
    } catch (err) {
        return err
    }
}

async function updateStateAssignedUsers(
    client: PrismaClient,
    idOfUserPerformingUpdate: string,
    stateCode: StateCodeType,
    assignedUserIDs: string[]
): Promise<UserType[] | Error> {
    try {
        const txRes = client.$transaction((tx) => {
            const result = updateStateAssignedUsersInTransaction(
                tx,
                idOfUserPerformingUpdate,
                stateCode,
                assignedUserIDs
            )

            if (result instanceof Error) {
                throw result
            }

            return result
        })
        return txRes
    } catch (err) {
        return err
    }
}

export { updateStateAssignedUsers }
