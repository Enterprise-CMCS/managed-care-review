import type { Span } from '@opentelemetry/api'
import type { HealthPlanPackageType } from '../../../domain-models'
import { convertContractWithRatesToUnlockedHPP } from '../../../domain-models/contractAndRates'
import type {
    ContractType,
    RateFormDataType,
    DocumentType,
} from '../../../domain-models/contractAndRates'
import { logError } from '../../../logger'
import { setErrorAttributesOnActiveSpan } from '../../attributeHelper'
import type {
    SubmissionDocument,
    UnlockedHealthPlanFormDataType,
} from '../../../../../app-web/src/common-code/healthPlanFormDataType'
import { calculateSHA256 } from '../../../handlers/add_sha'
import { rateFormDataSchema } from '../../../domain-models/contractAndRates'
import assert from 'assert'
import type { ContractOrErrorArrayType } from '../../../postgres/contractAndRates/findAllContractsWithHistoryByState'

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
        const parsedContract = convertContractWithRatesToUnlockedHPP(contract)
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

const convertHPPDocsToDomain = async (docs: SubmissionDocument[]) =>
    await Promise.all(
        docs.map(async ({ name, s3URL, sha256 }): Promise<DocumentType> => {
            let sha = sha256

            if (!sha) {
                sha = await calculateSHA256(s3URL)
            }

            return {
                name,
                s3URL,
                sha256: sha,
            }
        })
    )

const convertHealthPlanPackageRatesToDomain = async (
    unlockedFormData: UnlockedHealthPlanFormDataType
): Promise<RateFormDataType[] | Error> => {
    const rates: RateFormDataType[] = []

    for (const hppRateFormData of unlockedFormData.rateInfos) {
        const rateDocuments = await convertHPPDocsToDomain(
            hppRateFormData.rateDocuments
        )
        const supportingDocuments = await convertHPPDocsToDomain(
            hppRateFormData.supportingDocuments
        )

        const rate: RateFormDataType = {
            id: hppRateFormData.id,
            rateType: hppRateFormData.rateType,
            rateCapitationType: hppRateFormData.rateCapitationType,
            rateDocuments: rateDocuments,
            supportingDocuments: supportingDocuments,
            rateDateStart: hppRateFormData.rateDateStart,
            rateDateEnd: hppRateFormData.rateDateEnd,
            rateDateCertified: hppRateFormData.rateDateCertified,
            amendmentEffectiveDateStart:
                hppRateFormData.rateAmendmentInfo?.effectiveDateStart,
            amendmentEffectiveDateEnd:
                hppRateFormData.rateAmendmentInfo?.effectiveDateEnd,
            rateProgramIDs: hppRateFormData.rateProgramIDs,
            rateCertificationName: hppRateFormData.rateCertificationName,
            certifyingActuaryContacts: hppRateFormData.actuaryContacts,
            // Frontend UI saves both these two values ar the contract level of the HPP type. Our new Contract type does
            // not have these two fields, they are at the rate revision level. So, when converting we need to get the
            // values from the HPP contract and set them into our rate.
            addtlActuaryContacts: unlockedFormData.addtlActuaryContacts,
            //  toProtobuffer already does this, so we can directly set the value from the rate data.
            actuaryCommunicationPreference:
                hppRateFormData.actuaryCommunicationPreference,
            // This field is set to empty array because we still need to figure out shared rates. This is MR-3568
            packagesWithSharedRateCerts: [],
            // packagesWithSharedRateCerts: hppRateFormData.packagesWithSharedRateCerts &&
            //     hppRateFormData.packagesWithSharedRateCerts.filter(rate => (rate.packageId && rate.packageName)) as RateFormDataType['packagesWithSharedRateCerts']
        }

        const parsedDomainData = rateFormDataSchema.safeParse(rate)

        if (parsedDomainData instanceof Error) {
            return parsedDomainData
        }

        rates.push(rate)
    }

    return rates
}

function isEqualData(target: object, source: object): boolean {
    try {
        assert.deepStrictEqual(target, source, 'data not equal')
        return true
    } catch (e) {
        return false
    }
}

export {
    validateContractsAndConvert,
    convertHealthPlanPackageRatesToDomain,
    isEqualData,
}
