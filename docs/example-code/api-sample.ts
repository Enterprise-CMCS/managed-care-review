// @ts-nocheck

// GraphQL Query function
export function fetchMcReviewSettings(
    store: Store,
): QueryResolvers['fetchMcReviewSettings'] {
    return async (_parent, _args, context) => {
        const { user } = context

        if (!hasCMSPermissions(user) && !hasAdminPermissions(user)) {
            throw new ForbiddenError(msg, {
                cause: 'NOT_AUTHORIZED',
            })
        }

        const stateAssignments = await store.findAllSupportedStates()

        if (stateAssignments instanceof Error) {
            throw new GraphQLError(msg, {
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                    cause: 'DB_ERROR',
                },
            })
        }

        return {
            stateAssignments: stateAssignments,
        }
    }
}

// Related database function
export async function findAllSupportedStates(
   store: Store
): Promise<StateType[] | Error> {
    const pilotStateCodes = typedStatePrograms.states.map((state) => state.code)

    try {
        const allStates = await store.state.findMany({
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
        return err
    }
}


