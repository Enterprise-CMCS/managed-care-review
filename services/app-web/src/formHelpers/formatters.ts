import dayjs from 'dayjs'

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

// Convert api data for use in form.  Form fields must be a string.
// Empty values as an empty string, dates in date picker as YYYY-MM-DD, boolean as "Yes" "No" values
const formatForForm = (attribute: boolean | Date | string | null): string => {
    if (attribute === null) {
        return ''
    } else if (attribute instanceof Date) {
        return dayjs(attribute).format('YYYY-MM-DD')
    } else if (typeof attribute === 'boolean') {
        return attribute ? 'YES' : 'NO'
    } else {
        return attribute
    }
}

export { formatForApi, formatForForm, formatUserInputDate }
