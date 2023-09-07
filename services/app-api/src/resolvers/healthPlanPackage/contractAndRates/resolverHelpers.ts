import type {
    ContractOrErrorArrayType,
    UpdateDraftContractRatesType,
} from '../../../postgres/contractAndRates'
import type { Span } from '@opentelemetry/api'
import type { HealthPlanPackageType } from '../../../domain-models'
import type {
    ContractType,
    RateFormDataType,
    DocumentType,
    DraftContractType,
    RateRevisionType,
} from '../../../domain-models/contractAndRates'
import { convertContractToUnlockedHealthPlanPackage } from '../../../domain-models'
import { logError } from '../../../logger'
import { setErrorAttributesOnActiveSpan } from '../../attributeHelper'
import type {
    SubmissionDocument,
    UnlockedHealthPlanFormDataType,
} from '../../../../../app-web/src/common-code/healthPlanFormDataType'
import { calculateSHA256 } from '../../../handlers/add_sha'
import { rateFormDataSchema } from '../../../domain-models/contractAndRates'
import assert from 'assert'

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

function isEqualData(target: object, source: object): boolean {
    try {
        assert.deepStrictEqual(target, source, 'Rate data not equal')
        return true
    } catch (e) {
        return false
    }
}

const convertHealthPlanPackageRateToDomain = async (
    unlockedFormData: UnlockedHealthPlanFormDataType
): Promise<RateFormDataType[] | Error> => {
    const rates: RateFormDataType[] = []

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

    for (const hppRate of unlockedFormData.rateInfos) {
        const rateDocuments = await convertHPPDocsToDomain(
            hppRate.rateDocuments
        )
        const supportingDocuments = await convertHPPDocsToDomain(
            hppRate.supportingDocuments
        )

        const rate: RateFormDataType = {
            id: hppRate.id,
            rateType: hppRate.rateType,
            rateCapitationType: hppRate.rateCapitationType,
            rateDocuments: rateDocuments,
            supportingDocuments: supportingDocuments,
            rateDateStart: hppRate.rateDateStart,
            rateDateEnd: hppRate.rateDateEnd,
            rateDateCertified: hppRate.rateDateCertified,
            amendmentEffectiveDateStart:
                hppRate.rateAmendmentInfo?.effectiveDateStart,
            amendmentEffectiveDateEnd:
                hppRate.rateAmendmentInfo?.effectiveDateEnd,
            rateProgramIDs: hppRate.rateProgramIDs,
            rateCertificationName: hppRate.rateCertificationName,
            certifyingActuaryContacts: hppRate.actuaryContacts,
            // TODO: The next two fields are not accounted for on the frontend UI. The frontend still thinks both these
            //  fields are on the contract level. For now all rates will get their value from the contract level.
            addtlActuaryContacts: unlockedFormData.addtlActuaryContacts,
            actuaryCommunicationPreference:
                unlockedFormData.addtlActuaryCommunicationPreference,
            // TODO: This field is set to empty array because we still need to figure out shared rates. This is MR-3568
            packagesWithSharedRateCerts: [],
            // packagesWithSharedRateCerts: hppRate.packagesWithSharedRateCerts &&
            //     hppRate.packagesWithSharedRateCerts.filter(rate => (rate.packageId && rate.packageName)) as RateFormDataType['packagesWithSharedRateCerts']
        }

        const parsedDomainData = rateFormDataSchema.safeParse(rate)

        if (parsedDomainData instanceof Error) {
            return parsedDomainData
        }

        rates.push(rate)
    }

    return rates
}

const convertSortToDomainRate = async (
    contractWithHistory: DraftContractType,
    unlockedFormData: UnlockedHealthPlanFormDataType
): Promise<UpdateDraftContractRatesType | Error> => {
    // convert all the HPP rates data to new domain rates data. This is RateRevisionType.formData
    const convertedRatesData = await convertHealthPlanPackageRateToDomain(
        unlockedFormData
    )
    // All rates in the draft revision
    const draftRatesFromDB: RateRevisionType[] =
        contractWithHistory.draftRevision.rateRevisions

    // return error if any of the rates failed converting.
    if (convertedRatesData instanceof Error) {
        return convertedRatesData
    }

    // now we filter
    const connectOrCreate: UpdateDraftContractRatesType['connectOrCreate'] = []
    const updateRateRevisions: UpdateDraftContractRatesType['updateRateRevisions'] =
        []
    const disconnectRates: UpdateDraftContractRatesType['disconnectRates'] = []

    // Find rates to create, connect or update
    convertedRatesData.forEach((rateData) => {
        // If convertedRate has no revision ID, it gets pushed to connectOrCreate. In the data the ID is the revisionID.
        if (!rateData.id) {
            connectOrCreate.push(rateData)
            return
        }

        // Find a matching rate revision id in the draftRates array. We want to do this after the undefined id check for
        // any edge case where id from db is also undefined.
        const matchingDBRate = draftRatesFromDB.find(
            (dbRate) => dbRate.id === rateData.id
        )

        // If there are no matching rates we push into connectOrCreate. This usually means there is a revision ID, but
        // the rates from the contract in the DB does not have it. This could be a connection, although the handler will
        // figure out if we need to create or connect.
        if (!matchingDBRate) {
            connectOrCreate.push(rateData)
            return
        }

        // If a match is found then we deep compare to figure out if we need to update.
        const isRateDataEqual = isEqualData(matchingDBRate.formData, rateData)

        // If rates are not equal we then make the update
        if (!isRateDataEqual) {
            updateRateRevisions.push(rateData)
        }
    })

    // Find rates to disconnect
    draftRatesFromDB.forEach((dbRate) => {
        const dbRateData = dbRate.formData

        // make sure this draftRate revision formData from the DB has revision.id and rateID
        if (!dbRateData.id || !dbRateData.rateID) {
            // skip because this has no required IDs
            return
        }

        //Find a matching rate revision id in the convertedRatesData
        const matchingHPPRate = convertedRatesData.map(
            (convertedRate) => convertedRate.id === dbRateData.id
        )

        // If convertedRateData does not contain the rate from DB, we push this revisions rateID in disconnectRates
        if (!matchingHPPRate) {
            disconnectRates.push(dbRateData.rateID)
        }
    })

    // return UpdateDraftContractRatesType

    return {
        draftContract: contractWithHistory,
        connectOrCreate,
        updateRateRevisions,
        disconnectRates,
    }
}

export {
    validateContractsAndConvert,
    convertSortToDomainRate,
    isEqualData,
    convertHealthPlanPackageRateToDomain,
}
