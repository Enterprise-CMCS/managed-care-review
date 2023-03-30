import * as Yup from 'yup'
import { FeatureFlagTypes } from '../../../common-code/featureFlags'
import { validateDateFormat } from '../../../formHelpers'

Yup.addMethod(Yup.date, 'validateDateFormat', validateDateFormat)

type FeatureFlagsForYup = Partial<Record<FeatureFlagTypes, boolean>>

// Formik setup
// Should be listed in order of appearance on field to allow errors to focus as expected
const SubmissionTypeFormSchema = (flags: FeatureFlagsForYup = {}) =>
    Yup.object().shape({
        programIDs: Yup.array().min(1, 'You must select at least one program'),
        submissionType: Yup.string().required(
            'You must choose a submission type'
        ),
        contractType: Yup.string().required('You must choose a contract type'),
        riskBasedContract: Yup.string().required('You must select yes or no'),
        submissionDescription: Yup.string().required(
            'You must provide a description of any major changes or updates'
        ),
    })

export { SubmissionTypeFormSchema }
