import { InsertContractArgsType } from '../../postgres/contractAndRates/insertContract'
import { State } from '@prisma/client'
import { must } from '../errorHelpers'
import { PrismaClient } from '@prisma/client'

const createDraftContractData = (
    contractArgs?: Partial<InsertContractArgsType>
): InsertContractArgsType => {
    return {
        stateCode: contractArgs?.stateCode ?? 'MN',
        submissionType: contractArgs?.submissionType ?? 'CONTRACT_AND_RATES',
        submissionDescription:
            contractArgs?.submissionDescription ?? 'Contract 1.0',
        contractType: contractArgs?.contractType ?? 'BASE',
        programIDs: contractArgs?.programIDs ?? ['PMAP'],
        populationCovered: contractArgs?.populationCovered ?? 'MEDICAID',
        riskBasedContract: contractArgs?.riskBasedContract ?? false,
    }
}

const getStateRecord = async (
    client: PrismaClient,
    stateCode: string
): Promise<State> => {
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

export { createDraftContractData, getStateRecord }
