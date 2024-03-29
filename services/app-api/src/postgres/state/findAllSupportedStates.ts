import type { StateType } from '../../domain-models'
import statePrograms from '../../../../app-web/src/common-code/data/statePrograms.json'
import type { PrismaClient } from '@prisma/client'

// Returns postgres state info for the states that currently supported for pilot.
// Supported states are state that have had their programs added to the statePrograms json file.
export async function findAllSupportedStates(
    client: PrismaClient
): Promise<StateType[] | Error> {
    const pilotStateCodes = statePrograms.states.map((state) => state.code)

    try {
        const allStates = await client.state.findMany({
            orderBy: {
                stateCode: 'asc',
            },
        })

        return allStates.filter((state) =>
            pilotStateCodes.includes(state.stateCode)
        )
    } catch (err) {
        console.error(err)
        return err
    }
}
