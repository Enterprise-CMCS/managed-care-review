import * as Yup from 'yup'

const ReplaceRateSchema =
    Yup.object().shape({
        replaceReason: Yup.string().required('You must provide a reason for revoking this rate certification.'),
        replacementRateID: Yup.string().required('You must select a replacement rate certification.'),
    })

export { ReplaceRateSchema }
