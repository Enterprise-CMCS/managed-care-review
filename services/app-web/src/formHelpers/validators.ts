/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
import dayjs from 'dayjs'
import * as Yup from 'yup'

/*  
    validateDateFormat is a custom Yup method
    This is needed to validate manual user input format (usually MM/DD/YYYY) and display specific errors when user input is invalid
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
export { validateDateFormat }
