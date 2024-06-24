import type {
    ContractRevisionType,
    RateRevisionWithContractsType,
} from '../../domain-models/contractAndRates'
import type { RateRevisionTableWithContracts } from './prismaSubmittedRateHelpers'
import { contractRevisionToDomainModel } from './parseContractWithHistory'
import {
    type ContractRevisionTableWithFormData,
    convertUpdateInfoToDomainModel,
    rateFormDataToDomainModel,
} from './prismaSharedContractRateHelpers'

function draftContractsToDomainModel(
    relatedContractRevisions: ContractRevisionTableWithFormData[]
): ContractRevisionType[] {
    return relatedContractRevisions.map((c) => contractRevisionToDomainModel(c))
}

// -----------

function draftRateRevToDomainModel(
    revision: RateRevisionTableWithContracts
): RateRevisionWithContractsType {
    return {
        id: revision.id,
        rateID: revision.rateID,
        createdAt: revision.createdAt,
        updatedAt: revision.updatedAt,
        unlockInfo: convertUpdateInfoToDomainModel(revision.unlockInfo),
        formData: rateFormDataToDomainModel(revision),
        contractRevisions: draftContractsToDomainModel(
            revision.relatedSubmissions[0].submittedContracts
        ),
    }
}

export { draftRateRevToDomainModel }
