import type { StateCodeType } from 'app-web/src/common-code/healthPlanFormDataType'
import type { ProgramType } from '../domain-models'
import statePrograms from 'app-web/src/common-code/data/statePrograms.json'
import type { PrismaClient, State } from '@prisma/client'
import { must } from './errorHelpers'

function getProgramsFromState(stateCode: StateCodeType): ProgramType[] {
    const state = statePrograms.states.find((st) => st.code === stateCode)

    return state?.programs || []
}

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

export { getProgramsFromState, getStateRecord }
