import {
    FetchContractQuery,
    Contract,
    FetchContractDocument,
    UpdateDraftContractRatesDocument,
    UpdateDraftContractRatesMutation
} from '../../gen/gqlClient'
import { MockedResponse } from '@apollo/client/testing'
import { mockContractPackageDraft } from './contractPackageDataMock'

const fetchContractMockSuccess = ({
    contract,
}: {
    contract?: Partial<Contract>
}): MockedResponse<FetchContractQuery> => {
    const contractData = mockContractPackageDraft(contract)

    return {
        request: {
            query: FetchContractDocument,
            variables: { input: { contractID: contractData.id } },
        },
        result: {
            data: {
                fetchContract: {
                    contract: {
                        ...contractData,
                    },
                },
            },
        },
    }
}

const updateDraftContractRatesMockSuccess = ({
    contract,
}: {
    contract?: Partial<Contract>
}): MockedResponse<UpdateDraftContractRatesMutation> => {
    const contractData = mockContractPackageDraft(contract)
    const contractInput = {
        contractID: contractData.id,
        updatedRates: [
            {
                formData: {
                rateType: undefined,
                rateCapitationType: undefined,
                rateDocuments: [],
                supportingDocuments: [],
                rateDateStart: undefined,
                rateDateEnd: undefined,
                rateDateCertified: undefined,
                amendmentEffectiveDateStart: undefined,
                amendmentEffectiveDateEnd: undefined,
                rateProgramIDs: [],
                certifyingActuaryContacts: [
                    {
                        name: "",
                        titleRole: "",
                        email: "",
                        actuarialFirm: undefined,
                        actuarialFirmOther: ""
                    }
                ],
                addtlActuaryContacts: [
                    {
                        name: "",
                        titleRole: "",
                        email: "",
                        actuarialFirm: undefined,
                        actuarialFirmOther: ""
                    }
                ],
                actuaryCommunicationPreference: undefined,
                packagesWithSharedRateCerts: [],
            },
            rateID: undefined,
            type: "CREATE"
        }]
    }
    return {
        request: {
            query: UpdateDraftContractRatesDocument,
            variables: { input: contractInput },
        },
        result: {
            data: {
                updateDraftContractRates: {
                    contract: {
                        ...contractData,
                    },
                },
            },
        },
    }
}
export { fetchContractMockSuccess, updateDraftContractRatesMockSuccess }
