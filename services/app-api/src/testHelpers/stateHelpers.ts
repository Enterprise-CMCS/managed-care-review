import type { State } from '@prisma/client'
import { must } from './assertionHelpers'
import type { ExtendedPrismaClient } from '../postgres/prismaClient'

async function getStateRecord(
    client: ExtendedPrismaClient,
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
