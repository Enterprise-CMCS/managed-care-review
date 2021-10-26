import * as Yup from 'yup'
import dayjs from 'dayjs'
import isLeapYear from 'dayjs/plugin/isLeapYear'
import { validateDateFormat } from '../../../formHelpers'

Yup.addMethod(Yup.date, 'validateDateFormat', validateDateFormat)
dayjs.extend(isLeapYear)

const RateDetailsFormSchema = Yup.object().shape({
    rateType: Yup.string().defined('You must choose a rate certification type'),
    rateDateStart: Yup.date()
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore-next-line
        .validateDateFormat('YYYY-MM-DD', true)
        .defined('You must enter a start date')
        .typeError('The start date must be in MM/DD/YYYY format'),
    rateDateEnd: Yup.date()
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore-next-line
        .validateDateFormat('YYYY-MM-DD', true)
        .defined('You must enter an end date')
        .typeError('The end date must be in MM/DD/YYYY format')
        .min(
            Yup.ref('rateDateStart'),
            'The end date must come after the start date'
        ),
    rateDateCertified: Yup.date()
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore-next-line
        .validateDateFormat('YYYY-MM-DD', true)
        .defined('You must enter the date the document was certified')
        .typeError('The certified date must be in MM/DD/YYYY format'),
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
})
export { RateDetailsFormSchema }
