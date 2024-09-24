import statePrograms from '../../../../app-web/src/common-code/data/statePrograms.json'
import type { PrismaTransactionType } from '../prismaTypes'
import type { UserType } from '../../domain-models'
import { NotFoundError } from '../postgresErrors'
import { parseDomainUsersFromPrismaUsers } from '../user/prismaDomainUser'

async function findStateAssignedUsers( client: PrismaTransactionType, stateCode: string):  Promise<UserType[] | Error> {
    const pilotStateCodes = statePrograms.states.map((state) => state.code)
    if(!pilotStateCodes.includes(stateCode)) {
        return new Error(`${stateCode} is not a supported state code`)
    }

    try {
        const state = await client.state.findFirst({
            where: {
                stateCode
            },
            include: {
                assignedCMSUsers: {
                    where: {
                        role: {
                            in: ['CMS_USER', 'CMS_APPROVER_USER'],
                        },
                    },
                    include: {
                        stateAssignments: true,
                    },
                },
            },
        })

        if (!state) {
            const err = `Cannot find state with code: ${stateCode}`
            return new NotFoundError(err)
        }

        const users = parseDomainUsersFromPrismaUsers(
            state.assignedCMSUsers
        )

        return users
    } catch (err) {
        console.error(err)
        return new Error(err)
    }
}

export {  findStateAssignedUsers }
