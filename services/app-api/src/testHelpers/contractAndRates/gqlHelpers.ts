import { ApolloServer } from "apollo-server-lambda"
import { RateType } from "../../domain-models/contractAndRates"
import { StateCodeType } from "app-web/src/common-code/healthPlanFormDataType"
import { getProgramsFromState } from "../stateHelpers"
import { defaultFloridaProgram } from "../gqlHelpers"

const createTestRate = async (
    server: ApolloServer,
    stateCode?: StateCodeType
): Promise<RateType> => {
    const programs = stateCode
        ? getProgramsFromState(stateCode)
        : [defaultFloridaProgram()]

    const programIDs = programs.map((program) => program.id)
    const input: CreateRateInput = {
        programIDs: programIDs,
        populationCovered: 'MEDICAID',
        riskBasedContract: false,
        submissionType: 'CONTRACT_ONLY',
        submissionDescription: 'A created submission',
        contractType: 'BASE',
    }
    const result = await server.executeOperation({
        query: CREATE_RATE,
        variables: { input },
    })
    if (result.errors) {
        throw new Error(
            `createRate mutation failed with errors ${result.errors}`
        )
    }

    if (!result.data) {
        throw new Error('createRate returned nothing')
    }

    return result.data.createHealthPlanPackage.pkg
}
