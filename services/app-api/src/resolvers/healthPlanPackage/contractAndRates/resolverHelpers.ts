import type { ContractOrErrorArrayType } from '../../../postgres/contractAndRates'
import type { Span } from '@opentelemetry/api'
import type { HealthPlanPackageType } from '../../../domain-models'
import type { ContractType } from '../../../domain-models/contractAndRates'
import { convertContractToUnlockedHealthPlanPackage } from '../../../domain-models'
import { logError } from '../../../logger'
import { setErrorAttributesOnActiveSpan } from '../../attributeHelper'

const validateContractsAndConvert = (
    contractsWithHistory: ContractOrErrorArrayType,
    span?: Span
): HealthPlanPackageType[] => {
    // separate valid contracts and errors
    const parsedContracts: ContractType[] = []
    const errorParseContracts: string[] = []
    contractsWithHistory.forEach((parsed) => {
        if (parsed.contract instanceof Error) {
            errorParseContracts.push(
                `${parsed.contractID}: ${parsed.contract.message}`
            )
        } else {
            parsedContracts.push(parsed.contract)
        }
    })

    // log all contracts that failed parsing to otel.
    if (errorParseContracts.length > 0) {
        const errMessage = `Failed to parse the following contracts:\n${errorParseContracts.join(
            '\n'
        )}`
        logError('indexHealthPlanPackagesResolver', errMessage)
        setErrorAttributesOnActiveSpan(errMessage, span)
    }

    // convert contract type to health plan package type and filter out failures
    const convertedContracts: HealthPlanPackageType[] = []
    const errorConvertContracts: string[] = []
    parsedContracts.forEach((contract) => {
        const parsedContract =
            convertContractToUnlockedHealthPlanPackage(contract)
        if (parsedContract instanceof Error) {
            errorConvertContracts.push(
                `${contract.id}: ${parsedContract.message}`
            )
        } else {
            convertedContracts.push(parsedContract)
        }
    })

    // log all contracts that failed converting
    if (errorConvertContracts.length > 0) {
        const errMessage = `Failed to covert the following contracts to health plan packages:\n${errorConvertContracts.join(
            '\n'
        )}`
        logError('indexHealthPlanPackagesResolver', errMessage)
        setErrorAttributesOnActiveSpan(errMessage, span)
    }

    return convertedContracts
}

export { validateContractsAndConvert }
