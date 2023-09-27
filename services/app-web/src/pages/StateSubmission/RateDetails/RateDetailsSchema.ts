import * as Yup from 'yup'
import { dayjs } from '../../../common-code/dateHelpers'
import { FeatureFlagSettings } from '../../../common-code/featureFlags'
import { validateDateFormat } from '../../../formHelpers'
import {
    validateFileItemsList,
    validateFileItemsListSingleUpload,
} from '../../../formHelpers/validators'

Yup.addMethod(Yup.date, 'validateDateFormat', validateDateFormat)

const SingleRateCertSchema = (activeFeatureFlags: FeatureFlagSettings) =>
    Yup.object().shape({
        rateDocuments: validateFileItemsListSingleUpload({ required: true }),
        supportingDocuments: activeFeatureFlags['supporting-docs-by-rate']
            ? validateFileItemsList({ required: false })
            : Yup.mixed(),
        hasSharedRateCert: activeFeatureFlags['packages-with-shared-rates']
            ? Yup.string().defined('You must select yes or no')
            : Yup.string(),
        packagesWithSharedRateCerts: activeFeatureFlags[
            'packages-with-shared-rates'
        ]
            ? Yup.array()
                  .when('hasSharedRateCert', {
                      is: 'YES',
                      then: Yup.array().min(
                          1,
                          'You must select at least one submission'
                      ),
                  })
                  .required()
            : Yup.array(),
        rateProgramIDs: Yup.array().min(1, 'You must select a program'),
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
        actuaryCommunicationPreference: Yup.string().optional(),
    })

const RateDetailsFormSchema = (activeFeatureFlags?: FeatureFlagSettings) => {
    return Yup.object().shape({
        rateInfos: Yup.array().of(
            SingleRateCertSchema(activeFeatureFlags || {})
        ),
    })
}

export { RateDetailsFormSchema }
