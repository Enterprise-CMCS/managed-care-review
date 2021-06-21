/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
import dayjs from 'dayjs'
import * as Yup from 'yup'

/*  
    validateDateFormat is a custom Yup method
    This is needed to transform manual user input format MM/DD/YYYY to YYYY-MM-DD 
    and display specific errors when date is invalid
    More on this approach: https://github.com/jquense/yup#yupaddmethodschematype-schema-name-string-method--schema-void

*/
function validateDateFormat(
    this: Yup.DateSchema<
        Date | undefined,
        Record<string, any>,
        Date | undefined
    >,
    formats: string,
    parseStrict: boolean
): Yup.DateSchema<Date | undefined, Record<string, any>, Date | undefined> {
    return this.transform(function (value, originalValue) {
        if (this.isType(value)) return value
        value = dayjs(originalValue, formats, parseStrict)
        return value.isValid() ? value.toDate() : new Date('') // force return 'Invalid Date'
    })
}

const isDateRangeEmpty = (startDate: string, endDate: string) =>
    !startDate && !endDate

export { isDateRangeEmpty, validateDateFormat }
