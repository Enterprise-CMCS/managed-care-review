import type { CMSUsersUnionType, StateType } from '../../domain-models'
import { typedStatePrograms } from '@mc-review/hpp'
import type { PrismaClient } from '@prisma/client'

// Returns postgres state info for the states that currently supported for pilot.
// Supported states are state that have had their programs added to the statePrograms json file.
export async function findAllSupportedStates(
    client: PrismaClient
): Promise<StateType[] | Error> {
    const pilotStateCodes = typedStatePrograms.states.map((state) => state.code)

    try {
        const allStates = await client.state.findMany({
            orderBy: {
                stateCode: 'asc',
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

        const states = allStates.filter((state) =>
            pilotStateCodes.includes(state.stateCode)
        )

        return states.map((state) => ({
            ...state,
            assignedCMSUsers: state.assignedCMSUsers.map(
                (user) =>
                    ({
                        id: user.id,
                        role: user.role,
                        givenName: user.givenName,
                        familyName: user.familyName,
                        email: user.email,
                        stateAssignments: user.stateAssignments,
                        divisionAssignment: user.divisionAssignment,
                    }) as CMSUsersUnionType
            ),
        }))
    } catch (err) {
        console.error(err)
        return err
    }
}
