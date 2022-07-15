import { dayjs } from '../../../app-web/src/common-code/dateHelpers'
import { CalendarDate } from '../common-code/healthPlanFormDataType'

const formatUserInputDate = (initialValue?: string): string | undefined => {
    const dayjsValue = dayjs(initialValue)
    return initialValue && dayjsValue.isValid()
        ? dayjs(initialValue).format('YYYY-MM-DD')
        : initialValue // preserve undefined to show validations later
}
// Convert form fields to pass data to api. GQL handles null for empty fields.
const formatForApi = (attribute: string): string | null => {
    if (attribute === '') {
        return null
    }
    return attribute
}

const formatYesNoForProto = (
    attribute: string | undefined
): boolean | undefined => {
    if (attribute === 'YES') {
        return true
    }
    if (attribute === 'NO') {
        return false
    }
    return undefined
}

// Convert api data for use in form.  Form fields must be a string.
// Empty values as an empty string, dates in date picker as YYYY-MM-DD, boolean as "Yes" "No" values
const formatForForm = (
    attribute: boolean | CalendarDate | string | null | undefined
): string => {
    if (attribute === null || attribute === undefined) {
        return ''
        // } else if (attribute instanceof Date) {
        //     return dayjs(attribute).utc().format('YYYY-MM-DD')
    } else if (typeof attribute === 'boolean') {
        return attribute ? 'YES' : 'NO'
    } else {
        return attribute
    }
}

const formatFormDateForDomain = (
    attribute: string
): CalendarDate | undefined => {
    if (attribute === '') {
        return undefined
    }
    // attribute looks like YYYY-MM-DD
    const parsedDate = attribute.split('-')
    const month = parsedDate[1]
    const day = parsedDate[2]
    const year = parsedDate[0]
    return `${year}-${month}-${day}` as CalendarDate
}

export {
    formatForApi,
    formatForForm,
    formatUserInputDate,
    formatYesNoForProto,
    formatFormDateForDomain,
}
