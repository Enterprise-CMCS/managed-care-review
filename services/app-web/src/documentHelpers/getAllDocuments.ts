import { HealthPlanFormDataType } from '../common-code/healthPlanFormDataType'

const getAllDocuments = (pkg: HealthPlanFormDataType) => {
    let allDocuments = [...pkg.contractDocuments, ...pkg.documents]
    if (pkg.rateInfos.length > 0) {
        pkg.rateInfos.forEach((rateInfo) => {
            allDocuments = allDocuments.concat(rateInfo.rateDocuments)
            allDocuments = allDocuments.concat(rateInfo.supportingDocuments)
        })
    }
    return allDocuments
}

export { getAllDocuments }
