import type {
    ContractRevisionWithRatesType,
    RateRevisionType,
} from '../../domain-models/contractAndRates'
import {
    type RateRevisionTableWithFormData,
    contractFormDataToDomainModel,
    convertUpdateInfoToDomainModel,
    rateRevisionToDomainModel,
} from './prismaSharedContractRateHelpers'
import type { ContractRevisionTableWithRates } from './prismaSubmittedContractHelpers'

function draftRatesToDomainModel(
    relatedRateRevisions: RateRevisionTableWithFormData[]
): RateRevisionType[] {
    const domainRates: RateRevisionType[] = []

    for (const rateRev of relatedRateRevisions) {
        const domainRate = rateRevisionToDomainModel(rateRev)

        domainRates.push(domainRate)
    }

    return domainRates
}

// -------------------

function draftContractRevToDomainModel(
    revision: ContractRevisionTableWithRates
): ContractRevisionWithRatesType {
    return {
        id: revision.id,
        contract: revision.contract,
        createdAt: revision.createdAt,
        updatedAt: revision.updatedAt,
        unlockInfo: convertUpdateInfoToDomainModel(revision.unlockInfo),
        formData: contractFormDataToDomainModel(revision),
        rateRevisions: draftRatesToDomainModel(
            revision.relatedSubmisions[0].submittedRates
        ),
    }
}

export { draftContractRevToDomainModel }
