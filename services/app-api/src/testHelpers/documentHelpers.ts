import type {
    ContractFormData,
    GenericDocument,
    RateFormData,
} from '../gen/gqlServer'

// Clear document metadata that is added by API
// enables direct compare between document lists (created by FE and submitted by users)
// and the return  document lists (created by BE parsers and API and include metadata such as dateAdded)
const clearDocMetadata = (documents?: GenericDocument[]): GenericDocument[] => {
    if (!documents) return []
    return documents.map((doc) => {
        // ID is metadata used on the frontend for caching, otherwise apollo client has no unique identifier for docs
        // it is not needed on the BE.
        delete doc['id']
        delete doc['dateAdded']
        return doc
    })
}

const clearMetadataFromContractFormData = (
    contractForm: ContractFormData
): ContractFormData => {
    return {
        ...contractForm,
        contractDocuments: clearDocMetadata(contractForm.contractDocuments),
        supportingDocuments: clearDocMetadata(contractForm.supportingDocuments),
    }
}

const clearMetadataFromRateFormData = (
    rateForm: RateFormData
): RateFormData => {
    return {
        ...rateForm,
        rateDocuments: clearDocMetadata(rateForm.rateDocuments),
        supportingDocuments: clearDocMetadata(rateForm.supportingDocuments),
    }
}
const s3DlUrl =
    'https://fake-bucket.s3.amazonaws.com/file.pdf?AWSAccessKeyId=AKIAIOSFODNN7EXAMPLE&Expires=1719564800&Signature=abc123def456ghijk' //pragma: allowlist secret

export {
    s3DlUrl,
    clearDocMetadata,
    clearMetadataFromRateFormData,
    clearMetadataFromContractFormData,
}
