import * as Yup from 'yup'

const currencyValidationMessage =
    'Enter a valid number with up to 2 decimal places'

const currencyFieldSchema = Yup.string()
    .optional()
    .test(
        'is-valid-currency',
        currencyValidationMessage,
        (value) =>
            !value ||
            /^\$?\d+(\.\d{1,2})?$/.test(value.trim().replace(/,/g, ''))
    )

export const SDPSubmissionDetailsSchema = Yup.object().shape({
    submissionType: Yup.string().required('You must select a submission type'),
    programIDs: Yup.array().min(1, 'You must select at least one program'),
    changesIncluded: Yup.array().min(
        1,
        'You must select at least one change included in this preprint'
    ),
    ratingPeriodStart: Yup.string().required('You must enter a start date'),
    ratingPeriodEnd: Yup.string()
        .required('You must enter an end date')
        .test(
            'end-after-start',
            'The end date must be on or after the start date',
            function (value) {
                const { ratingPeriodStart } = this.parent
                if (!ratingPeriodStart || !value) return true
                return new Date(value) >= new Date(ratingPeriodStart)
            }
        ),
    automaticallyRenewed: Yup.string().required(
        'You must select whether this payment arrangement is renewed automatically'
    ),
    estimatedFederalShare: currencyFieldSchema,
    estimatedStateShare: currencyFieldSchema,
})
