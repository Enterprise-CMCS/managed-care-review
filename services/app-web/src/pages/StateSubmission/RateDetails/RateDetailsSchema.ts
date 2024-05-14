import * as Yup from 'yup'
import { dayjs } from '../../../common-code/dateHelpers'
import { FeatureFlagSettings } from '../../../common-code/featureFlags'
import { validateDateFormat } from '../../../formHelpers'
import {
    validateFileItemsList,
    validateFileItemsListSingleUpload,
} from '../../../formHelpers/validators'

Yup.addMethod(Yup.date, 'validateDateFormat', validateDateFormat)

const SingleRateCertSchema = (_activeFeatureFlags: FeatureFlagSettings) =>
    Yup.object().shape({
        rateDocuments: validateFileItemsListSingleUpload({ required: true }),
        supportingDocuments: validateFileItemsList({ required: false }),
        hasSharedRateCert:  _activeFeatureFlags['rate-edit-unlock'] || _activeFeatureFlags['link-rates']?  Yup.string(): Yup.string().defined('You must select yes or no'),
        packagesWithSharedRateCerts: _activeFeatureFlags['rate-edit-unlock'] || _activeFeatureFlags['link-rates']? Yup.array().optional():  Yup.array()
        .when('hasSharedRateCert', {
            is: 'YES',
            then: Yup.array().min(
                1,
                'You must select at least one submission'
            ),
        })
        .required(),
        rateProgramIDs: Yup.array(
        ).min(1, 'You must indicate which rate are included in this certification'),
        rateType: Yup.string().defined(
            'You must choose a rate certification type'
        ),
        rateCapitationType: Yup.string().defined(
            "You must select whether you're certifying rates or rate ranges"
        ),
        rateDateStart: Yup.date().when('rateType', (contractType) => {
            if (contractType) {
                return (
                    Yup.date()
                        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                        // @ts-ignore-next-line
                        .validateDateFormat('YYYY-MM-DD', true)
                        .defined('You must enter a start date')
                        .typeError(
                            'The start date must be in MM/DD/YYYY format'
                        )
                )
            }
        }),
        rateDateEnd: Yup.date().when('rateType', (rateType) => {
            if (rateType) {
                return (
                    Yup.date()
                        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                        // @ts-ignore-next-line
                        .validateDateFormat('YYYY-MM-DD', true)
                        .defined('You must enter an end date')
                        .typeError('The end date must be in MM/DD/YYYY format')
                        .when(
                            // RateDateEnd must be at minimum the day after Start
                            'rateDateStart',
                            (rateDateStart: Date, schema: Yup.DateSchema) => {
                                const startDate = dayjs(rateDateStart)
                                if (startDate.isValid()) {
                                    return schema.min(
                                        startDate.add(1, 'day'),
                                        'The end date must come after the start date'
                                    )
                                }
                            }
                        )
                )
            }
        }),
        rateDateCertified: Yup.date().when('rateType', (rateType) => {
            if (rateType) {
                return (
                    Yup.date()
                        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                        // @ts-ignore-next-line
                        .validateDateFormat('YYYY-MM-DD', true)
                        .defined(
                            'You must enter the date the document was certified'
                        )
                        .typeError(
                            'The certified date must be in MM/DD/YYYY format'
                        )
                )
            }
        }),
        effectiveDateStart: Yup.date().when('rateType', {
            is: 'AMENDMENT',
            then: Yup.date()
                .nullable()
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore-next-line
                .validateDateFormat('YYYY-MM-DD', true)
                .defined('You must enter a start date')
                .typeError('The start date must be in MM/DD/YYYY format'),
        }),
        effectiveDateEnd: Yup.date().when('rateType', {
            is: 'AMENDMENT',
            then: Yup.date()
                .nullable()
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore-next-line
                .validateDateFormat('YYYY-MM-DD', true)
                .defined('You must enter an end date')
                .typeError('The end date must be in MM/DD/YYYY format')
                .min(
                    Yup.ref('effectiveDateStart'),
                    'The end date must come after the start date'
                ),
        }),
        actuaryContacts: Yup.array().of(
            Yup.object().shape({
                name: Yup.string().required('You must provide a name'),
                titleRole: Yup.string().required(
                    'You must provide a title/role'
                ),
                email: Yup.string()
                    .email('You must enter a valid email address')
                    .required('You must provide an email address'),
                actuarialFirm: Yup.string()
                    .required('You must select an actuarial firm')
                    .nullable(),
                actuarialFirmOther: Yup.string()
                    .when('actuarialFirm', {
                        is: 'OTHER',
                        then: Yup.string()
                            .required('You must enter a description')
                            .nullable(),
                    })
                    .nullable(),
            })
        ),
        addtlActuaryContacts: Yup.array().of(
            Yup.object().shape({
                name: Yup.string().required('You must provide a name'),
                titleRole: Yup.string().required(
                    'You must provide a title/role'
                ),
                email: Yup.string()
                    .email('You must enter a valid email address')
                    .required('You must provide an email address'),
                actuarialFirm: Yup.string()
                    .required('You must select an actuarial firm')
                    .nullable(),
                actuarialFirmOther: Yup.string()
                    .when('actuarialFirm', {
                        is: 'OTHER',
                        then: Yup.string()
                            .required('You must enter a description')
                            .nullable(),
                    })
                    .nullable(),
            })
        ),
        actuaryCommunicationPreference: Yup.string().required(
            'You must select a communication preference'
        )
})


const RateDetailsFormSchema = (activeFeatureFlags?: FeatureFlagSettings, isMultiRate?: boolean) => {
    // LEGACY V1
    if(!activeFeatureFlags?.['link-rates']) {
        return  Yup.object().shape({
            rateInfos: Yup.array().of(
                SingleRateCertSchema(activeFeatureFlags || {})
            )
            })
    } else {

    // V2 SCHEMAS
    return isMultiRate ?
        Yup.object().shape({
            rateForms: Yup.array().of(
            Yup.object()
                .when('.ratePreviouslySubmitted', {
                    // make the user select something for rate preivously submitted yes no question
                    is: undefined,
                    then: Yup.object().shape({
                        ratePreviouslySubmitted: activeFeatureFlags['link-rates']? Yup.string().defined(
                            "You must select yes or no "
                        ) : Yup.string(),
                    }),
                        })
                .when('.ratePreviouslySubmitted', {
                    // make the user select a linked rate, skip all other validations for a previously submitted rate
                    is: 'YES',
                    then: Yup.object().shape({
                        linkRateSelect: Yup.string().defined('You must select a rate certification'),
                    }),
                })
                .when('.ratePreviouslySubmitted', {
                    // continue with normal rate form validations when its a new rate
                    is: 'NO',
                    then: SingleRateCertSchema(activeFeatureFlags || {})
                })
        )})
        // This the standlaone rate unlock page schema
        // it does not use linked rate form fields at all - user must always fill rate data from scratch
        // eventually this could be just a single rate cert schema, but for now since the UI is shared, it still uses an array like RateDetailsV2
        : Yup.object().shape({
            rateForms: Yup.array().of(
                SingleRateCertSchema(activeFeatureFlags || {})
            )
        })
    }
}

export { RateDetailsFormSchema }
