import type { PrismaClient, State } from '@prisma/client'
import { must } from './assertionHelpers'

async function getStateRecord(
    client: PrismaClient,
    stateCode: string
): Promise<State> {
    const state = must(
        await client.state.findFirst({
            where: {
                stateCode,
            },
        })
    )

    if (!state) {
        throw new Error('Unexpected prisma error: state record not found')
    }

    return state
}

export { getStateRecord }
